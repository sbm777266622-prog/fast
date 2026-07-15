import { z } from "zod";
import { eq, and, desc, asc, sql, count } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { paymentGateways, orders, payments, cards, customers, packages } from "@db/schema";
import { confirmCardSale, releaseReservedCard } from "./card-router";
import { logger } from "./logger";

// ─── Mock Payment Gateway Service ───
class PaymentGatewayService {
  async processPayment(
    gatewayCode: string,
    amount: string,
    currency: string,
    reference: string,
    customerPhone?: string
  ): Promise<{
    success: boolean;
    transactionId?: string;
    status: "pending" | "completed" | "failed";
    message: string;
    mockData?: Record<string, unknown>;
  }> {
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock success for demonstration
    const isSuccess = Math.random() > 0.1; // 90% success rate for demo

    if (isSuccess) {
      return {
        success: true,
        transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        status: "completed",
        message: "Payment processed successfully",
        mockData: {
          gateway: gatewayCode,
          amount,
          currency,
          customerPhone,
          processedAt: new Date().toISOString(),
        },
      };
    } else {
      return {
        success: false,
        status: "failed",
        message: "Payment failed. Please try again.",
        mockData: {
          gateway: gatewayCode,
          amount,
          error: "Insufficient balance or transaction declined",
        },
      };
    }
  }

  async verifyPayment(
    gatewayCode: string,
    transactionId: string
  ): Promise<{
    verified: boolean;
    status: "pending" | "completed" | "failed";
    details?: Record<string, unknown>;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      verified: true,
      status: "completed",
      details: { transactionId, gateway: gatewayCode, verifiedAt: new Date().toISOString() },
    };
  }
}

const paymentService = new PaymentGatewayService();

export const paymentRouter = createRouter({
  // ─── PUBLIC: Get active payment gateways ───
  getGateways: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.isActive, true))
      .orderBy(asc(paymentGateways.sortOrder));
    return result;
  }),

  // ─── PUBLIC: Process payment ───
  process: publicQuery
    .input(
      z.object({
        orderId: z.number(),
        gatewayId: z.number(),
        customerPhone: z.string(),
        customerEmail: z.string().email().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get order
      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order[0]) throw new Error("Order not found");
      if (order[0].status !== "pending") throw new Error("Order is not pending");

      // Get gateway
      const gateway = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.id, input.gatewayId))
        .limit(1);

      if (!gateway[0]) throw new Error("Payment gateway not found");
      if (!gateway[0].isActive) throw new Error("Payment gateway is not active");

      // Create payment record
      const [paymentResult] = await db.insert(payments).values({
        orderId: input.orderId,
        paymentGatewayId: input.gatewayId,
        amount: order[0].finalAmount,
        currency: order[0].currency,
        status: "pending",
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        notes: input.notes,
      });

      const paymentId = Number(paymentResult.insertId);

      // Process payment through gateway
      const processResult = await paymentService.processPayment(
        gateway[0].code,
        String(order[0].finalAmount),
        order[0].currency,
        order[0].orderNumber,
        input.customerPhone
      );

      // Update payment record with result
      await db
        .update(payments)
        .set({
          status: processResult.status,
          gatewayReference: processResult.transactionId,
          gatewayResponse: processResult.mockData || null,
          confirmedAt: processResult.status === "completed" ? new Date() : null,
          notes: processResult.message,
        })
        .where(eq(payments.id, paymentId));

      // If payment successful, confirm order
      if (processResult.success && processResult.status === "completed") {
        if (order[0].cardId) {
          await confirmCardSale(db, order[0].cardId, order[0].packageId);
        }

        const now = new Date();
        await db
          .update(orders)
          .set({
            status: "paid",
            paymentStatus: "completed",
            paymentReference: processResult.transactionId,
            paymentConfirmedAt: now,
            updatedAt: now,
          })
          .where(eq(orders.id, input.orderId));

        // Update customer stats
        await db
          .update(customers)
          .set({
            totalOrders: sql`${customers.totalOrders} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${order[0].finalAmount}`,
            lastPurchaseAt: now,
          })
          .where(eq(customers.id, order[0].customerId));

        logger.info("Payment completed", { orderId: input.orderId, gateway: gateway[0].code });

        return {
          success: true,
          paymentId,
          status: "paid",
          transactionId: processResult.transactionId,
          message: processResult.message,
        };
      } else {
        // Payment failed - release card
        if (order[0].cardId) {
          await releaseReservedCard(db, order[0].cardId, order[0].packageId);
        }

        await db
          .update(orders)
          .set({
            status: "failed",
            paymentStatus: "failed",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, input.orderId));

        logger.info("Payment failed", { orderId: input.orderId, gateway: gateway[0].code });

        return {
          success: false,
          paymentId,
          status: "failed",
          message: processResult.message,
        };
      }
    }),

  // ─── PUBLIC: Manual payment (for gateways without API) ───
  submitManual: publicQuery
    .input(
      z.object({
        orderId: z.number(),
        gatewayId: z.number(),
        customerPhone: z.string(),
        transferNumber: z.string(),
        senderName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get order
      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order[0]) throw new Error("Order not found");

      // Get gateway
      const gateway = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.id, input.gatewayId))
        .limit(1);

      if (!gateway[0]) throw new Error("Payment gateway not found");

      // Create payment record with manual status
      const [paymentResult] = await db.insert(payments).values({
        orderId: input.orderId,
        paymentGatewayId: input.gatewayId,
        amount: order[0].finalAmount,
        currency: order[0].currency,
        status: "pending",
        gatewayReference: input.transferNumber,
        customerPhone: input.customerPhone,
        notes: `Manual transfer: ${input.transferNumber}. Sender: ${input.senderName || "N/A"}. ${input.notes || ""}`,
      });

      // Update order to manual confirmation
      await db
        .update(orders)
        .set({
          paymentStatus: "manual",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId));

      logger.info("Manual payment submitted", {
        orderId: input.orderId,
        transferNumber: input.transferNumber,
      });

      return {
        success: true,
        paymentId: Number(paymentResult.insertId),
        status: "pending_manual",
        message: "Payment details submitted. Waiting for admin confirmation.",
      };
    }),

  // ─── ADMIN: Confirm manual payment ───
  confirmManual: adminQuery
    .input(
      z.object({
        paymentId: z.number(),
        orderId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order[0]) throw new Error("Order not found");

      // Confirm card sale
      if (order[0].cardId) {
        await confirmCardSale(db, order[0].cardId, order[0].packageId);
      }

      const now = new Date();

      // Update order
      await db
        .update(orders)
        .set({
          status: "paid",
          paymentStatus: "completed",
          paymentConfirmedAt: now,
          paymentConfirmedBy: ctx.user.id,
          updatedAt: now,
        })
        .where(eq(orders.id, input.orderId));

      // Update payment
      await db
        .update(payments)
        .set({
          status: "completed",
          confirmedAt: now,
          confirmedBy: ctx.user.id,
        })
        .where(eq(payments.id, input.paymentId));

      // Update customer stats
      await db
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${order[0].finalAmount}`,
          lastPurchaseAt: now,
        })
        .where(eq(customers.id, order[0].customerId));

      logger.info("Manual payment confirmed", {
        orderId: input.orderId,
        paymentId: input.paymentId,
        by: ctx.user.name,
      });

      return { success: true, status: "paid" };
    }),

  // ─── ADMIN: Refund payment ───
  refund: adminQuery
    .input(
      z.object({
        paymentId: z.number(),
        amount: z.string().or(z.number()).optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, input.paymentId))
        .limit(1);

      if (!payment[0]) throw new Error("Payment not found");

      const refundAmount = input.amount
        ? typeof input.amount === "string" ? input.amount : String(input.amount)
        : payment[0].amount;

      await db
        .update(payments)
        .set({
          status: "refunded",
          refundAmount,
          refundReason: input.reason,
        })
        .where(eq(payments.id, input.paymentId));

      // Update order status
      await db
        .update(orders)
        .set({
          status: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, payment[0].orderId));

      logger.info("Payment refunded", { paymentId: input.paymentId, by: ctx.user.name });
      return { success: true };
    }),

  // ─── ADMIN: CRUD Payment Gateways ───
  createGateway: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().optional(),
        provider: z.string().min(1),
        isActive: z.boolean().default(true),
        isDefault: z.boolean().default(false),
        supportsAutoConfirm: z.boolean().default(false),
        requiresManualConfirm: z.boolean().default(false),
        sortOrder: z.number().default(0),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // If default, unset other defaults
      if (input.isDefault) {
        await db
          .update(paymentGateways)
          .set({ isDefault: false })
          .where(eq(paymentGateways.isDefault, true));
      }

      const [result] = await db.insert(paymentGateways).values({
        name: input.name,
        code: input.code,
        description: input.description,
        provider: input.provider,
        isActive: input.isActive,
        isDefault: input.isDefault,
        supportsAutoConfirm: input.supportsAutoConfirm,
        requiresManualConfirm: input.requiresManualConfirm,
        sortOrder: input.sortOrder,
        config: input.config || {},
      });

      logger.info("Payment gateway created", {
        gatewayId: Number(result.insertId),
        by: ctx.user.name,
      });

      return { id: Number(result.insertId), success: true };
    }),

  updateGateway: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        description: z.string().optional(),
        provider: z.string().optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
        supportsAutoConfirm: z.boolean().optional(),
        requiresManualConfirm: z.boolean().optional(),
        sortOrder: z.number().optional(),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;

      if (data.isDefault) {
        await db
          .update(paymentGateways)
          .set({ isDefault: false })
          .where(eq(paymentGateways.isDefault, true));
      }

      await db.update(paymentGateways).set(data).where(eq(paymentGateways.id, id));

      logger.info("Payment gateway updated", { gatewayId: id, by: ctx.user.name });
      return { success: true };
    }),

  deleteGateway: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(paymentGateways).where(eq(paymentGateways.id, input.id));
      logger.info("Payment gateway deleted", { gatewayId: input.id, by: ctx.user.name });
      return { success: true };
    }),

  listAllGateways: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(paymentGateways).orderBy(asc(paymentGateways.sortOrder));
  }),

  // ─── ADMIN: List payments ───
  list: authedQuery
    .input(
      z.object({
        status: z.enum(["pending", "completed", "failed", "refunded", "cancelled"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = input || {};
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (filters.status) {
        conditions.push(eq(payments.status, filters.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(payments)
        .where(whereClause)
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: count() })
        .from(payments)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),
});
