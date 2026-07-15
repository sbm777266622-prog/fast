import { z } from "zod";
import { eq, and, desc, asc, sql, like } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { packages } from "@db/schema";
import { logger } from "./logger";

export const packageRouter = createRouter({
  // ─── PUBLIC: List active packages ───
  list: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select()
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(asc(packages.sortOrder));
    return result;
  }),

  // ─── PUBLIC: Get single package ───
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(packages)
        .where(eq(packages.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  getByCode: publicQuery
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(packages)
        .where(eq(packages.code, input.code))
        .limit(1);
      return result[0] || null;
    }),

  // ─── ADMIN: List all packages ───
  listAll: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(packages).orderBy(asc(packages.sortOrder));
  }),

  // ─── ADMIN: Create package ───
  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        code: z.string().min(1).max(100),
        description: z.string().optional(),
        price: z.string().or(z.number()),
        originalPrice: z.string().or(z.number()).optional(),
        durationDays: z.number().optional(),
        speed: z.string().optional(),
        quotaGB: z.number().optional(),
        sortOrder: z.number().default(0),
        color: z.string().optional(),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const price = typeof input.price === "string" ? input.price : String(input.price);
      const originalPrice = input.originalPrice
        ? typeof input.originalPrice === "string"
          ? input.originalPrice
          : String(input.originalPrice)
        : null;

      const [result] = await db.insert(packages).values({
        name: input.name,
        code: input.code,
        description: input.description,
        price,
        originalPrice,
        durationDays: input.durationDays,
        speed: input.speed,
        quotaGB: input.quotaGB,
        sortOrder: input.sortOrder,
        color: input.color,
        isActive: input.isActive,
        isFeatured: input.isFeatured,
      });

      logger.info("Package created", { packageId: Number(result.insertId), by: ctx.user.name });
      return { id: Number(result.insertId), success: true };
    }),

  // ─── ADMIN: Update package ───
  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        code: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        price: z.string().or(z.number()).optional(),
        originalPrice: z.string().or(z.number()).optional(),
        durationDays: z.number().optional(),
        speed: z.string().optional(),
        quotaGB: z.number().optional(),
        sortOrder: z.number().optional(),
        color: z.string().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = typeof data.price === "string" ? data.price : String(data.price);
      if (data.originalPrice !== undefined) updateData.originalPrice = typeof data.originalPrice === "string" ? data.originalPrice : String(data.originalPrice);
      if (data.durationDays !== undefined) updateData.durationDays = data.durationDays;
      if (data.speed !== undefined) updateData.speed = data.speed;
      if (data.quotaGB !== undefined) updateData.quotaGB = data.quotaGB;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;

      await db.update(packages).set(updateData).where(eq(packages.id, id));

      logger.info("Package updated", { packageId: id, by: ctx.user.name });
      return { success: true };
    }),

  // ─── ADMIN: Delete package ───
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(packages).where(eq(packages.id, input.id));
      logger.info("Package deleted", { packageId: input.id, by: ctx.user.name });
      return { success: true };
    }),

  // ─── ADMIN: Toggle active ───
  toggleActive: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const pkg = await db.select().from(packages).where(eq(packages.id, input.id)).limit(1);
      if (!pkg[0]) throw new Error("Package not found");
      await db
        .update(packages)
        .set({ isActive: !pkg[0].isActive })
        .where(eq(packages.id, input.id));
      logger.info("Package toggled", { packageId: input.id, by: ctx.user.name });
      return { success: true, isActive: !pkg[0].isActive };
    }),
});
