import { z } from "zod";
import { eq, and, desc, asc, sql, count, gte, lte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { auditLogs } from "@db/schema";
import { logger } from "./logger";

// ─── Helper: Log audit action ───
export async function logAudit(
  action: string,
  entity: string,
  entityId?: number,
  userId?: number,
  userRole?: string,
  userName?: string,
  description?: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      action,
      entity,
      entityId,
      userId,
      userRole,
      userName,
      description,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (error) {
    logger.error("Failed to log audit", { error, action, entity });
  }
}

export const auditRouter = createRouter({
  // ─── List audit logs ───
  list: authedQuery
    .input(
      z.object({
        action: z.string().optional(),
        entity: z.string().optional(),
        userId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
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
      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }
      if (filters.entity) {
        conditions.push(eq(auditLogs.entity, filters.entity));
      }
      if (filters.userId) {
        conditions.push(eq(auditLogs.userId, filters.userId));
      }
      if (filters.dateFrom) {
        conditions.push(gte(auditLogs.createdAt, new Date(filters.dateFrom)));
      }
      if (filters.dateTo) {
        conditions.push(lte(auditLogs.createdAt, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: count() })
        .from(auditLogs)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  // ─── Get recent activity ───
  getRecent: authedQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(20);
  }),
});
