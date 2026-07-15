import { z } from "zod";
import { eq, and, desc, asc, sql, like, count } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { customers } from "@db/schema";
import { logger } from "./logger";

export const customerRouter = createRouter({
  // ─── PUBLIC: Create or find customer ───
  create: publicQuery
    .input(
      z.object({
        fullName: z.string().optional(),
        phone: z.string().min(1),
        email: z.string().email().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if customer exists by phone
      const existing = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);

      if (existing[0]) {
        // Update last info
        await db
          .update(customers)
          .set({
            fullName: input.fullName || existing[0].fullName,
            email: input.email || existing[0].email,
            ipAddress: input.ipAddress || existing[0].ipAddress,
            userAgent: input.userAgent || existing[0].userAgent,
          })
          .where(eq(customers.id, existing[0].id));

        return { id: existing[0].id, isNew: false };
      }

      // Create new customer
      const [result] = await db.insert(customers).values({
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      return { id: Number(result.insertId), isNew: true };
    }),

  // ─── PUBLIC: Find by phone ───
  findByPhone: publicQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(customers)
        .where(eq(customers.phone, input.phone))
        .limit(1);
      return result[0] || null;
    }),

  // ─── ADMIN: List customers ───
  list: authedQuery
    .input(
      z.object({
        search: z.string().optional(),
        isBlocked: z.boolean().optional(),
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
      if (filters.search) {
        conditions.push(
          sql`${customers.phone} LIKE ${`%${filters.search}%`} OR ${customers.fullName} LIKE ${`%${filters.search}%`}`
        );
      }
      if (filters.isBlocked !== undefined) {
        conditions.push(eq(customers.isBlocked, filters.isBlocked));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(customers)
        .where(whereClause)
        .orderBy(filters.sortOrder === "asc" ? asc(customers.createdAt) : desc(customers.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: count() })
        .from(customers)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  // ─── ADMIN: Toggle block ───
  toggleBlock: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, input.id))
        .limit(1);

      if (!customer[0]) throw new Error("Customer not found");

      await db
        .update(customers)
        .set({ isBlocked: !customer[0].isBlocked })
        .where(eq(customers.id, input.id));

      logger.info("Customer block toggled", {
        customerId: input.id,
        isBlocked: !customer[0].isBlocked,
        by: ctx.user?.name,
      });

      return { success: true, isBlocked: !customer[0].isBlocked };
    }),

  // ─── ADMIN: Delete customer ───
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(customers).where(eq(customers.id, input.id));
      logger.info("Customer deleted", { customerId: input.id, by: ctx.user?.name });
      return { success: true };
    }),
});
