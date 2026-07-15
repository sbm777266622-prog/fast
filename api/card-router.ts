import { z } from "zod";
import { eq, and, desc, asc, sql, like, count, inArray, ne, isNull } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cards, packages, importBatches } from "@db/schema";
import { logger } from "./logger";
import type { MySql2Database } from "drizzle-orm/mysql2";

// ─── Helper: Generate unique order number ───
function generateOrderNumber(): string {
  const date = new Date();
  const prefix = "ORD";
  const timestamp = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timestamp}-${random}`;
}

// ─── Helper: Reserve a card atomically ───
async function reserveCardAtomically(
  db: MySql2Database,
  packageId: number,
  orderId: number,
  customerId: number,
  reserveMinutes = 10
): Promise<{ cardId: number; cardCode: string } | null> {
  // Use transaction with FOR UPDATE to prevent race conditions
  const result = await db.transaction(async (tx) => {
    // Find first available card with row lock
    const availableCards = await tx
      .select()
      .from(cards)
      .where(
        and(
          eq(cards.packageId, packageId),
          eq(cards.status, "available")
        )
      )
      .limit(1)
      .for("update");

    if (availableCards.length === 0) {
      return null;
    }

    const card = availableCards[0];
    const now = new Date();
    const reservedUntil = new Date(now.getTime() + reserveMinutes * 60 * 1000);

    // Update card to reserved
    await tx
      .update(cards)
      .set({
        status: "reserved",
        reservedAt: now,
        reservedUntil,
        orderId,
        customerId,
        updatedAt: now,
      })
      .where(eq(cards.id, card.id));

    // Decrease available count, increase reserved count
    await tx
      .update(packages)
      .set({
        availableCards: sql`${packages.availableCards} - 1`,
        reservedCards: sql`${packages.reservedCards} + 1`,
        updatedAt: now,
      })
      .where(eq(packages.id, packageId));

    return { cardId: card.id, cardCode: card.cardCode };
  });

  return result;
}

// ─── Helper: Confirm card sale ───
async function confirmCardSale(
  db: MySql2Database,
  cardId: number,
  packageId: number
): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(cards)
      .set({
        status: "sold",
        soldAt: now,
        reservedUntil: null,
        updatedAt: now,
      })
      .where(eq(cards.id, cardId));

    await tx
      .update(packages)
      .set({
        reservedCards: sql`${packages.reservedCards} - 1`,
        soldCards: sql`${packages.soldCards} + 1`,
        updatedAt: now,
      })
      .where(eq(packages.id, packageId));

    return true;
  });
}

// ─── Helper: Release reserved card ───
async function releaseReservedCard(
  db: MySql2Database,
  cardId: number,
  packageId: number
): Promise<boolean> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(cards)
      .set({
        status: "available",
        reservedAt: null,
        reservedUntil: null,
        orderId: null,
        customerId: null,
        updatedAt: now,
      })
      .where(eq(cards.id, cardId));

    await tx
      .update(packages)
      .set({
        reservedCards: sql`${packages.reservedCards} - 1`,
        availableCards: sql`${packages.availableCards} + 1`,
        updatedAt: now,
      })
      .where(eq(packages.id, packageId));

    return true;
  });
}

export { reserveCardAtomically, confirmCardSale, releaseReservedCard };

export const cardRouter = createRouter({
  // ─── PUBLIC: Get card count for a package ───
  getAvailableCount: publicQuery
    .input(z.object({ packageId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select({ count: count() })
        .from(cards)
        .where(
          and(
            eq(cards.packageId, input.packageId),
            eq(cards.status, "available")
          )
        );
      return result[0]?.count || 0;
    }),

  // ─── PUBLIC: Get card by order (after payment) ───
  getByOrder: publicQuery
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select({
          id: cards.id,
          cardCode: cards.cardCode,
          status: cards.status,
          soldAt: cards.soldAt,
          packageId: cards.packageId,
        })
        .from(cards)
        .where(eq(cards.orderId, input.orderId))
        .limit(1);
      return result[0] || null;
    }),

  // ─── ADMIN: List all cards with filters ───
  list: authedQuery
    .input(
      z.object({
        packageId: z.number().optional(),
        status: z.enum(["available", "reserved", "sold", "cancelled", "expired"]).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(50),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const filters = input || {};
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (filters.packageId) {
        conditions.push(eq(cards.packageId, filters.packageId));
      }
      if (filters.status) {
        conditions.push(eq(cards.status, filters.status));
      }
      if (filters.search) {
        conditions.push(like(cards.cardCode, `%${filters.search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db
        .select()
        .from(cards)
        .where(whereClause)
        .orderBy(filters.sortOrder === "asc" ? asc(cards.createdAt) : desc(cards.createdAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db
        .select({ count: count() })
        .from(cards)
        .where(whereClause);

      return {
        items,
        total: totalResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((totalResult[0]?.count || 0) / limit),
      };
    }),

  // ─── ADMIN: Add single card ───
  create: adminQuery
    .input(
      z.object({
        cardCode: z.string().min(1),
        packageId: z.number(),
        price: z.string().or(z.number()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Get package for price
      const pkg = await db
        .select()
        .from(packages)
        .where(eq(packages.id, input.packageId))
        .limit(1);

      if (!pkg[0]) throw new Error("Package not found");

      const price = input.price
        ? typeof input.price === "string" ? input.price : String(input.price)
        : pkg[0].price;

      const [result] = await db.insert(cards).values({
        cardCode: input.cardCode.trim(),
        packageId: input.packageId,
        price,
        status: "available",
        notes: input.notes,
        importedBy: ctx.user.id,
      });

      // Update package counts
      await db
        .update(packages)
        .set({
          totalCards: sql`${packages.totalCards} + 1`,
          availableCards: sql`${packages.availableCards} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(packages.id, input.packageId));

      logger.info("Card created", { cardId: Number(result.insertId), by: ctx.user.name });
      return { id: Number(result.insertId), success: true };
    }),

  // ─── ADMIN: Import cards from processed data ───
  importBatch: adminQuery
    .input(
      z.object({
        cards: z.array(z.object({
          cardCode: z.string().min(1),
        })),
        packageId: z.number(),
        batchName: z.string(),
        sourceFile: z.string(),
        fileType: z.enum(["pdf", "txt", "csv", "xlsx"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const now = new Date();

      // Get package
      const pkg = await db
        .select()
        .from(packages)
        .where(eq(packages.id, input.packageId))
        .limit(1);

      if (!pkg[0]) throw new Error("Package not found");

      // Create import batch record
      const [batchResult] = await db.insert(importBatches).values({
        batchName: input.batchName,
        packageId: input.packageId,
        sourceFile: input.sourceFile,
        fileType: input.fileType,
        totalRecords: input.cards.length,
        importedBy: ctx.user.id,
        startedAt: now,
      });

      const batchId = Number(batchResult.insertId);
      let imported = 0;
      let duplicates = 0;
      let invalid = 0;

      // Process cards in chunks to avoid memory issues
      const chunkSize = 500;
      const codes = input.cards.map((c) => c.cardCode.trim()).filter((c) => c.length > 0);

      // Check for existing codes
      const existingCards = await db
        .select({ cardCode: cards.cardCode })
        .from(cards)
        .where(inArray(cards.cardCode, codes.slice(0, 1000))); // Limit check

      const existingSet = new Set(existingCards.map((c) => c.cardCode));

      const newCards: Array<{
        cardCode: string;
        packageId: number;
        price: string;
        importBatchId: number;
        importedBy: number;
        sourceFile: string;
        status: "available";
        createdAt: Date;
        updatedAt: Date;
      }> = [];

      for (const code of codes) {
        if (existingSet.has(code)) {
          duplicates++;
          continue;
        }
        if (code.length < 3) {
          invalid++;
          continue;
        }
        newCards.push({
          cardCode: code,
          packageId: input.packageId,
          price: pkg[0].price,
          importBatchId: batchId,
          importedBy: ctx.user.id,
          sourceFile: input.sourceFile,
          status: "available",
          createdAt: now,
          updatedAt: now,
        });
      }

      // Insert in batches
      for (let i = 0; i < newCards.length; i += chunkSize) {
        const chunk = newCards.slice(i, i + chunkSize);
        if (chunk.length > 0) {
          await db.insert(cards).values(chunk);
          imported += chunk.length;
        }
      }

      // Update batch record
      await db
        .update(importBatches)
        .set({
          importedRecords: imported,
          duplicateRecords: duplicates,
          invalidRecords: invalid,
          status: imported > 0 ? "completed" : "failed",
          completedAt: new Date(),
        })
        .where(eq(importBatches.id, batchId));

      // Update package counts
      if (imported > 0) {
        await db
          .update(packages)
          .set({
            totalCards: sql`${packages.totalCards} + ${imported}`,
            availableCards: sql`${packages.availableCards} + ${imported}`,
            updatedAt: new Date(),
          })
          .where(eq(packages.id, input.packageId));
      }

      logger.info("Cards imported", {
        batchId,
        imported,
        duplicates,
        invalid,
        by: ctx.user.name,
      });

      return {
        batchId,
        total: input.cards.length,
        imported,
        duplicates,
        invalid,
        success: true,
      };
    }),

  // ─── ADMIN: Update card ───
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        cardCode: z.string().optional(),
        packageId: z.number().optional(),
        price: z.string().or(z.number()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.cardCode !== undefined) updateData.cardCode = data.cardCode.trim();
      if (data.packageId !== undefined) updateData.packageId = data.packageId;
      if (data.price !== undefined) updateData.price = typeof data.price === "string" ? data.price : String(data.price);
      if (data.notes !== undefined) updateData.notes = data.notes;
      updateData.updatedAt = new Date();

      await db.update(cards).set(updateData).where(eq(cards.id, id));
      logger.info("Card updated", { cardId: id, by: ctx.user.name });
      return { success: true };
    }),

  // ─── ADMIN: Delete card ───
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const card = await db.select().from(cards).where(eq(cards.id, input.id)).limit(1);
      if (!card[0]) throw new Error("Card not found");

      await db.delete(cards).where(eq(cards.id, input.id));

      // Update package counts
      if (card[0].status === "available") {
        await db
          .update(packages)
          .set({
            totalCards: sql`${packages.totalCards} - 1`,
            availableCards: sql`${packages.availableCards} - 1`,
            updatedAt: new Date(),
          })
          .where(eq(packages.id, card[0].packageId));
      }

      logger.info("Card deleted", { cardId: input.id, by: ctx.user.name });
      return { success: true };
    }),

  // ─── ADMIN: Get import batches ───
  getImportBatches: authedQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(importBatches)
      .orderBy(desc(importBatches.createdAt))
      .limit(100);
  }),

  // ─── ADMIN: Get dashboard stats ───
  getStats: authedQuery.query(async () => {
    const db = getDb();

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

    return {
      total: totalCards[0]?.count || 0,
      available: availableCards[0]?.count || 0,
      sold: soldCards[0]?.count || 0,
      reserved: reservedCards[0]?.count || 0,
    };
  }),
});
