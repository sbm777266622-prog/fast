import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: {
  unionId: string;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string;
  isActive?: boolean;
  lastSignInAt?: Date;
}) {
  const existing = await findUserByUnionId(data.unionId);
  
  if (existing) {
    // Update
    await db.update(users)
      .set({
        name: data.name ?? existing.name,
        email: data.email ?? existing.email,
        avatar: data.avatar ?? existing.avatar,
        role: data.role ?? existing.role,
        isActive: data.isActive ?? existing.isActive,
        lastSignInAt: data.lastSignInAt ?? existing.lastSignInAt,
        updatedAt: new Date(),
      })
      .where(eq(users.unionId, data.unionId));
    
    return findUserByUnionId(data.unionId);
  } else {
    // Insert
    const result = await db.insert(users).values({
      unionId: data.unionId,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role || "operator",
      isActive: data.isActive ?? true,
      lastSignInAt: data.lastSignInAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return findUserByUnionId(data.unionId);
  }
}