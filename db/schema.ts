import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  json,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ==================== USERS (Admins & Staff) ====================
export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["super_admin", "admin", "operator", "accountant", "viewer"])
    .default("operator")
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  permissions: json("permissions").$type<string[]>(),
  lastLoginAt: timestamp("last_login_at"),
  lastSignInAt: timestamp("last_sign_in_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== CUSTOMERS (Buyers) ====================
export const customers = mysqlTable("customers", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  fullName: varchar("full_name", { length: 255 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  totalOrders: int("total_orders").default(0).notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0").notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  lastPurchaseAt: timestamp("last_purchase_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("phone_idx").on(table.phone),
]);

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ==================== PACKAGES ====================
export const packages = mysqlTable("packages", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("YER").notNull(),
  durationDays: int("duration_days").default(30),
  speed: varchar("speed", { length: 100 }),
  quotaGB: int("quota_gb"),
  sortOrder: int("sort_order").default(0).notNull(),
  imageUrl: text("image_url"),
  color: varchar("color", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  totalCards: int("total_cards").default(0).notNull(),
  soldCards: int("sold_cards").default(0).notNull(),
  reservedCards: int("reserved_cards").default(0).notNull(),
  availableCards: int("available_cards").default(0).notNull(),
  meta: json("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("active_idx").on(table.isActive),
  index("sort_idx").on(table.sortOrder),
]);

export type Package = typeof packages.$inferSelect;
export type InsertPackage = typeof packages.$inferInsert;

// ==================== CARDS ====================
export const cards = mysqlTable("cards", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  cardCode: varchar("card_code", { length: 500 }).notNull(),
  packageId: bigint("package_id", { mode: "number", unsigned: true }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["available", "reserved", "sold", "cancelled", "expired"])
    .default("available")
    .notNull(),
  reservedAt: timestamp("reserved_at"),
  reservedUntil: timestamp("reserved_until"),
  soldAt: timestamp("sold_at"),
  orderId: bigint("order_id", { mode: "number", unsigned: true }),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }),
  importBatchId: bigint("import_batch_id", { mode: "number", unsigned: true }),
  importedBy: bigint("imported_by", { mode: "number", unsigned: true }),
  sourceFile: varchar("source_file", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("card_code_idx").on(table.cardCode),
  index("status_idx").on(table.status),
  index("package_status_idx").on(table.packageId, table.status),
  index("order_idx").on(table.orderId),
  index("customer_idx").on(table.customerId),
  index("batch_idx").on(table.importBatchId),
]);

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

// ==================== ORDERS ====================
export const orders = mysqlTable("orders", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).notNull(),
  packageId: bigint("package_id", { mode: "number", unsigned: true }).notNull(),
  cardId: bigint("card_id", { mode: "number", unsigned: true }),
  quantity: int("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("YER").notNull(),
  status: mysqlEnum("status", ["pending", "paid", "failed", "cancelled", "expired", "refunded"])
    .default("pending")
    .notNull(),
  paymentStatus: mysqlEnum("payment_status", ["pending", "completed", "failed", "refunded", "manual"])
    .default("pending")
    .notNull(),
  paymentGatewayId: bigint("payment_gateway_id", { mode: "number", unsigned: true }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  paymentConfirmedAt: timestamp("payment_confirmed_at"),
  paymentConfirmedBy: bigint("payment_confirmed_by", { mode: "number", unsigned: true }),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  source: varchar("source", { length: 50 }).default("web").notNull(),
  notes: text("notes"),
  meta: json("meta"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("order_number_idx").on(table.orderNumber),
  index("customer_order_idx").on(table.customerId),
  index("status_idx").on(table.status),
  index("payment_status_idx").on(table.paymentStatus),
  index("created_at_idx").on(table.createdAt),
]);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ==================== PAYMENTS ====================
export const payments = mysqlTable("payments", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull(),
  paymentGatewayId: bigint("payment_gateway_id", { mode: "number", unsigned: true }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("YER").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded", "cancelled"])
    .default("pending")
    .notNull(),
  gatewayResponse: json("gateway_response"),
  gatewayReference: varchar("gateway_reference", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 320 }),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: bigint("confirmed_by", { mode: "number", unsigned: true }),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundReason: text("refund_reason"),
  notes: text("notes"),
  meta: json("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ==================== PAYMENT GATEWAYS ====================
export const paymentGateways = mysqlTable("payment_gateways", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  provider: varchar("provider", { length: 100 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  config: json("config"),
  apiEndpoint: text("api_endpoint"),
  apiKey: varchar("api_key", { length: 500 }),
  apiSecret: varchar("api_secret", { length: 500 }),
  webhookUrl: text("webhook_url"),
  successUrl: text("success_url"),
  failureUrl: text("failure_url"),
  supportsAutoConfirm: boolean("supports_auto_confirm").default(false).notNull(),
  requiresManualConfirm: boolean("requires_manual_confirm").default(false).notNull(),
  iconUrl: text("icon_url"),
  sortOrder: int("sort_order").default(0).notNull(),
  meta: json("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = typeof paymentGateways.$inferInsert;

// ==================== IMPORT BATCHES ====================
export const importBatches = mysqlTable("import_batches", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  batchName: varchar("batch_name", { length: 255 }).notNull(),
  packageId: bigint("package_id", { mode: "number", unsigned: true }).notNull(),
  sourceFile: varchar("source_file", { length: 500 }).notNull(),
  fileType: mysqlEnum("file_type", ["pdf", "txt", "csv", "xlsx"]).notNull(),
  totalRecords: int("total_records").default(0).notNull(),
  importedRecords: int("imported_records").default(0).notNull(),
  duplicateRecords: int("duplicate_records").default(0).notNull(),
  invalidRecords: int("invalid_records").default(0).notNull(),
  status: mysqlEnum("status", ["processing", "completed", "failed", "partial"])
    .default("processing")
    .notNull(),
  importedBy: bigint("imported_by", { mode: "number", unsigned: true }),
  notes: text("notes"),
  meta: json("meta"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ImportBatch = typeof importBatches.$inferSelect;
export type InsertImportBatch = typeof importBatches.$inferInsert;

// ==================== AUDIT LOGS ====================
export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: bigint("entity_id", { mode: "number", unsigned: true }),
  userId: bigint("user_id", { mode: "number", unsigned: true }),
  userRole: varchar("user_role", { length: 50 }),
  userName: varchar("user_name", { length: 255 }),
  description: text("description"),
  oldValue: json("old_value"),
  newValue: json("new_value"),
  ipAddress: varchar("ip_address", { length: 100 }),
  userAgent: text("user_agent"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("action_idx").on(table.action),
  index("entity_idx").on(table.entity),
  index("user_idx").on(table.userId),
  index("created_at_idx").on(table.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ==================== SETTINGS ====================
export const settings = mysqlTable("settings", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  group: varchar("group", { length: 100 }).default("general").notNull(),
  label: varchar("label", { length: 255 }),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
