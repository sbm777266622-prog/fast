import { z } from "zod";
import { eq, and, desc, asc, sql, count, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  users,
  customers,
  orders,
  cards,
  packages,
  payments,
  auditLogs,
  importBatches,
} from "@db/schema";
import { logger } from "./logger";

export const adminRouter = createRouter({
  // ─── DASHBOARD: Main stats ───
  getDashboardStats: authedQuery.query(async () => {
    const db = getDb();

    // Cards stats
    const totalCards = await db.select({ count: count() }).from(cards);
    const availableCards = await db
      .select({ count: count() })
      .from(cards)
      .where(eq(cards.status, "available"));
    const soldCards = await db
      .select({ count: count() })
      .from(cards)
      .where(eq(cards.status, "sold"));
    const reservedCards = await db
      .select({ count: count() })
      .from(cards)
      .where(eq(cards.status, "reserved"));

    // Orders stats
    const totalOrders = await db.select({ count: count() }).from(orders);
    const pendingOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "pending"));
    const paidOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "paid"));

    // Revenue
    const totalRevenue = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.finalAmount}), 0)` })
      .from(orders)
      .where(eq(orders.status, "paid"));

    // Customers
    const totalCustomers = await db.select({ count: count() }).from(customers);

    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(gte(orders.createdAt, today));

    const todayRevenue = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.finalAmount}), 0)` })
      .from(orders)
      .where(and(gte(orders.createdAt, today), eq(orders.status, "paid")));

    return {
      cards: {
        total: totalCards[0]?.count || 0,
        available: availableCards[0]?.count || 0,
        sold: soldCards[0]?.count || 0,
        reserved: reservedCards[0]?.count || 0,
      },
      orders: {
        total: totalOrders[0]?.count || 0,
        pending: pendingOrders[0]?.count || 0,
        paid: paidOrders[0]?.count || 0,
      },
      revenue: {
        total: Number(totalRevenue[0]?.total || 0),
        today: Number(todayRevenue[0]?.total || 0),
      },
      customers: totalCustomers[0]?.count || 0,
      todayOrders: todayOrders[0]?.count || 0,
    };
  }),

  // ─── DASHBOARD: Recent orders ───
  getRecentOrders: authedQuery.query(async () => {
    const db = getDb();
    const recentOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(10);

    // Enrich with customer and package info
    const enriched = await Promise.all(
      recentOrders.map(async (order) => {
        const customerResult = await db
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .limit(1);
        const packageResult = await db
          .select()
          .from(packages)
          .where(eq(packages.id, order.packageId))
          .limit(1);
        return {
          ...order,
          customer: customerResult[0] || null,
          package: packageResult[0] || null,
        };
      })
    );

    return enriched;
  }),

  // ─── DASHBOARD: Sales chart data ───
  getSalesChart: authedQuery
    .input(
      z.object({
        period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        days: z.number().default(30),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const days = input?.days || 30;
      const period = input?.period || "daily";

      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      dateFrom.setHours(0, 0, 0, 0);

      // Get paid orders in date range
      const paidOrdersInRange = await db
        .select()
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, dateFrom),
            eq(orders.status, "paid")
          )
        )
        .orderBy(asc(orders.createdAt));

      // Group by date
      const grouped = new Map<string, { date: string; orders: number; revenue: number }>();

      for (const order of paidOrdersInRange) {
        const date = new Date(order.createdAt);
        const dateKey = date.toISOString().split("T")[0];

        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, { date: dateKey, orders: 0, revenue: 0 });
        }

        const entry = grouped.get(dateKey)!;
        entry.orders += 1;
        entry.revenue += Number(order.finalAmount);
      }

      // Fill missing dates
      const result: Array<{ date: string; orders: number; revenue: number }> = [];
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const dateKey = d.toISOString().split("T")[0];
        const entry = grouped.get(dateKey);
        result.push({
          date: dateKey,
          orders: entry?.orders || 0,
          revenue: entry?.revenue || 0,
        });
      }

      return result;
    }),

  // ─── DASHBOARD: Package sales distribution ───
  getPackageDistribution: authedQuery.query(async () => {
    const db = getDb();

    const allPackages = await db.select().from(packages).orderBy(asc(packages.sortOrder));

    const distribution = await Promise.all(
      allPackages.map(async (pkg) => {
        const sold = await db
          .select({ count: count() })
          .from(cards)
          .where(and(eq(cards.packageId, pkg.id), eq(cards.status, "sold")));
        return {
          name: pkg.name,
          code: pkg.code,
          price: pkg.price,
          sold: sold[0]?.count || 0,
        };
      })
    );

    return distribution;
  }),

  // ─── REPORTS: Full report ───
  getReport: authedQuery
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      const fromDate = new Date(input.dateFrom);
      const toDate = new Date(input.dateTo);
      toDate.setHours(23, 59, 59, 999);

      // Orders in range
      const rangeOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, fromDate),
            lte(orders.createdAt, toDate)
          )
        )
        .orderBy(asc(orders.createdAt));

      // Calculate stats
      const paidOrders = rangeOrders.filter((o) => o.status === "paid");
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.finalAmount), 0);

      // By package
      const packageStats = new Map<number, { name: string; orders: number; revenue: number }>();
      for (const order of paidOrders) {
        if (!packageStats.has(order.packageId)) {
          const pkg = await db
            .select()
            .from(packages)
            .where(eq(packages.id, order.packageId))
            .limit(1);
          packageStats.set(order.packageId, {
            name: pkg[0]?.name || "Unknown",
            orders: 0,
            revenue: 0,
          });
        }
        const stat = packageStats.get(order.packageId)!;
        stat.orders += 1;
        stat.revenue += Number(order.finalAmount);
      }

      return {
        summary: {
          totalOrders: rangeOrders.length,
          paidOrders: paidOrders.length,
          totalRevenue,
          averageOrder: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
        },
        byPackage: Array.from(packageStats.values()),
        orders: rangeOrders,
      };
    }),

  // ─── USERS: List admin users ───
  listUsers: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(users).orderBy(desc(users.createdAt));
  }),

  // ─── USERS: Update user role ───
  updateUserRole: adminQuery
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["super_admin", "admin", "operator", "accountant", "viewer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.id));
      logger.info("User role updated", { userId: input.id, role: input.role, by: ctx.user.name });
      return { success: true };
    }),

  // ─── USERS: Toggle user active ───
  toggleUserActive: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const user = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
      if (!user[0]) throw new Error("User not found");

      await db
        .update(users)
        .set({ isActive: !user[0].isActive })
        .where(eq(users.id, input.id));

      logger.info("User toggled", { userId: input.id, by: ctx.user.name });
      return { success: true };
    }),

  // ─── BACKUP: Create database backup ───
  createBackup: adminQuery.mutation(async ({ ctx }) => {
    // In production, this would create a SQL dump
    // For now, return a success message
    logger.info("Backup requested", { by: ctx.user.name });
    return {
      success: true,
      message: "Backup feature: Use MySQL dump command for production backups",
      command: "mysqldump -u root -p netcard_pro > backup_" + Date.now() + ".sql",
    };
  }),
});
