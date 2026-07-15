import { z } from "zod";
import { eq, and, desc, asc, sql, like, count, gte, lte } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, cards, packages, customers, payments, paymentGateways } from "@db/schema";
import { reserveCardAtomically, confirmCardSale, releaseReservedCard } from "./card-router";
import { logger } from "./logger";

// ─── Helper: Generate unique order number ───
function generateOrderNumber(): string {
  const date = new Date();
  const prefix = "NCP";
  const timestamp =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0") +
    String(date.getHours()).padStart(2, "0") +
    String(date.getMinutes()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
}

export const orderRouter = createRouter({
  // ─── PUBLIC: Create order ───
  create: publicQuery
    .input(
      z.object({
        customerId: z.number(),
        packageId: z.number(),
        paymentGatewayId: z.number(),
        customerPhone: z.string(),
        customerEmail: z.string().email().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get package
      const pkg = await db
        .select()
        .from(packages)
        .where(eq(packages.id, input.packageId))
        .limit(1);

      if (!pkg[0]) throw new Error("Package not found");
      if (!pkg[0].isActive) throw new Error("Package is not active");

      // Check if cards available
      const availableCount = await db
        .select({ count: count() })
        .from(cards)
        .where(
          and(
            eq(cards.packageId, input.packageId),
            eq(cards.status, "available")
          )
        );

      if ((availableCount[0]?.count || 0) === 0) {
        throw new Error("No cards available for this package");
      }

      // Reserve card atomically (prevents double-sell)
      const orderNumber = generateOrderNumber();

      // Create order first (pending)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

      const [orderResult] = await db.insert(orders).values({
        orderNumber,
        customerId: input.customerId,
        packageId: input.packageId,
        quantity: 1,
        unitPrice: pkg[0].price,
        totalAmount: pkg[0].price,
        finalAmount: pkg[0].price,
        status: "pending",
        paymentStatus: "pending",
        paymentGatewayId: input.paymentGatewayId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        notes: input.notes,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      const orderId = Number(orderResult.insertId);

      // Reserve card
      const reserved = await reserveCardAtomically(
        db,
        input.packageId,
        orderId,
        input.customerId,
        10
      );

      if (!reserved) {
        // No card available - cancel order
        await db
          .update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, orderId));
        throw new Error("Card sold out during order creation");
      }

      // Update order with card
      await db
        .update(orders)
        .set({ cardId: reserved.cardId, updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      logger.info("Order created", { orderId, orderNumber, customerId: input.customerId });

      return {
        orderId,
        orderNumber,
        status: "pending",
        amount: pkg[0].price,
        expiresAt,
        cardReserved: true,
      };
    }),

  // ─── PUBLIC: Get order by number ───
  getByNumber: publicQuery
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerId: orders.customerId,
          packageId: orders.packageId,
          cardId: orders.cardId,
          quantity: orders.quantity,
          totalAmount: orders.totalAmount,
          finalAmount: orders.finalAmount,
          currency: orders.currency,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          paymentGatewayId: orders.paymentGatewayId,
          paymentReference: orders.paymentReference,
          paymentConfirmedAt: orders.paymentConfirmedAt,
          notes: orders.notes,
          expiresAt: orders.expiresAt,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .where(eq(orders.orderNumber, input.orderNumber))
        .limit(1);

      if (!result[0]) return null;

      // Get customer
      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, result[0].customerId))
        .limit(1);

      // Get package
      const packageResult = await db
        .select()
        .from(packages)
        .where(eq(packages.id, result[0].packageId))
        .limit(1);

      // Get card (only if paid)
      let cardResult = null;
      if (result[0].status === "paid" && result[0].cardId) {
        const cardData = await db
          .select({ id: cards.id, cardCode: cards.cardCode, status: cards.status, soldAt: cards.soldAt })
          .from(cards)
          .where(eq(cards.id, result[0].cardId))
          .limit(1);
        cardResult = cardData[0] || null;
      }

      return {
        ...result[0],
        customer: customerResult[0] || null,
        package: packageResult[0] || null,
        card: cardResult,
      };
    }),

  // ─── PUBLIC: Get order by phone ───
  getByPhone: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();

      // Find customer
      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);

      if (!customerResult[0]) return [];

      const customerOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customerResult[0].id))
        .orderBy(desc(orders.createdAt))
        .limit(20);

      return customerOrders;
    }),

  // ─── PUBLIC: Confirm payment ───
  confirmPayment: publicQuery
    .input(
      z.object({
        orderId: z.number(),
        paymentReference: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order[0]) throw new Error("Order not found");
      if (order[0].status !== "pending") throw new Error("Order is not pending");
      if (!order[0].cardId) throw new Error("No card reserved for this order");

      // Confirm card sale
      const confirmed = await confirmCardSale(db, order[0].cardId, order[0].packageId);
      if (!confirmed) throw new Error("Failed to confirm card sale");

      // Update order
      const now = new Date();
      await db
        .update(orders)
        .set({
          status: "paid",
          paymentStatus: "completed",
          paymentReference: input.paymentReference,
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

      // Create payment record
      await db.insert(payments).values({
        orderId: input.orderId,
        paymentGatewayId: order[0].paymentGatewayId,
        amount: order[0].finalAmount,
        currency: order[0].currency,
        status: "completed",
        gatewayReference: input.paymentReference,
        confirmedAt: now,
      });

      logger.info("Payment confirmed", { orderId: input.orderId });

      return { success: true, status: "paid" };
    }),

  // ─── PUBLIC: Cancel order ───
  cancel: publicQuery
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order[0]) throw new Error("Order not found");
      if (order[0].status !== "pending") throw new Error("Order cannot be cancelled");

      // Release card if reserved
      if (order[0].cardId) {
        await releaseReservedCard(db, order[0].cardId, order[0].packageId);
      }

      await db
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(orders.id, input.orderId));

      logger.info("Order cancelled", { orderId: input.orderId });
      return { success: true };
    }),

  // ─── PUBLIC: Check expired orders ───
  checkExpired: publicQuery
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order[0]) return { expired: true, status: "not_found" };
      if (order[0].status !== "pending") return { expired: false, status: order[0].status };

      const now = new Date();
      const expired = order[0].expiresAt ? new Date(order[0].expiresAt) < now : false;

      if (expired) {
        // Release card
        if (order[0].cardId) {
          await releaseReservedCard(db, order[0].cardId, order[0].packageId);
        }

        await db
          .update(orders)
          .set({ status: "expired", updatedAt: now })
          .where(eq(orders.id, input.orderId));

        return { expired: true, status: "expired" };
      }

      return {
        expired: false,
        status: order[0].status,
        expiresAt: order[0].expiresAt,
      };
    }),

  // ─── ADMIN: List all orders ───
  list: authedQuery
    .input(
      z.object({
        status: z.enum(["pending", "paid", "failed", "cancelled", "expired", "refunded"]).optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
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
        conditions.push(eq(orders.status, filters.status));
      }
      if (filters.search) {
        conditions.push(like(orders.orderNumber, `%${filters.search}%`));
      }
      if (filters.dateFrom) {
        conditions.push(gte(orders.createdAt, new Date(filters.dateFrom)));
      }
      if (filters.dateTo) {
        conditions.push(lte(orders.createdAt, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(filters.sortOrder === "asc" ? asc(orders.createdAt) : desc(orders.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: count() })
        .from(orders)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  // ─── ADMIN: Get single order with details ───
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .limit(1);

      if (!order[0]) return null;

      const customerResult = await db
        .select()
        .from(customers)
        .where(eq(customers.id, order[0].customerId))
        .limit(1);

      const packageResult = await db
        .select()
        .from(packages)
        .where(eq(packages.id, order[0].packageId))
        .limit(1);

      const cardResult = order[0].cardId
        ? await db
            .select()
            .from(cards)
            .where(eq(cards.id, order[0].cardId))
            .limit(1)
        : [];

      return {
        ...order[0],
        customer: customerResult[0] || null,
        package: packageResult[0] || null,
        card: cardResult[0] || null,
      };
    }),

  // ─── ADMIN: Update order status ───
  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "paid", "failed", "cancelled", "expired", "refunded"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      await db
        .update(orders)
        .set({
          status: input.status,
          notes: input.notes,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.id));

      logger.info("Order status updated", {
        orderId: input.id,
        status: input.status,
        by: ctx.user?.name,
      });

      return { success: true };
    }),

  // ─── ADMIN: Get dashboard stats ───
  getStats: authedQuery.query(async () => {
    const db = getDb();

    const total = await db.select({ count: count() }).from(orders);
    const pending = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "pending"));
    const paid = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "paid"));
    const cancelled = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "cancelled"));

    const revenue = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.finalAmount}), 0)` })
      .from(orders)
      .where(eq(orders.status, "paid"));

    return {
      total: total[0]?.count || 0,
      pending: pending[0]?.count || 0,
      paid: paid[0]?.count || 0,
      cancelled: cancelled[0]?.count || 0,
      revenue: revenue[0]?.total || 0,
    };
  }),
});
