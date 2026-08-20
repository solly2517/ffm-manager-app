import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "manager", "delegate", "warehouse_hero", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  pushNotifications: boolean("pushNotifications").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  locationSharing: boolean("locationSharing").default(false).notNull(),
}, (table) => ({ emailIdx: index("users_email_idx").on(table.email) }));

export const clientErrorReports = mysqlTable("client_error_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  message: varchar("message", { length: 500 }).notNull(),
  stack: text("stack"),
  componentStack: text("componentStack"),
  route: varchar("route", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => ({ createdIdx: index("client_error_created_idx").on(table.createdAt), userIdx: index("client_error_user_idx").on(table.userId) }));

export const managerDelegateAssignments = mysqlTable("manager_delegate_assignments", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull(),
  delegateId: int("delegateId").notNull(),
  assignedBy: int("assignedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ managerIdx: index("manager_delegate_manager_idx").on(table.managerId), delegateIdx: index("manager_delegate_delegate_idx").on(table.delegateId), pairUnique: uniqueIndex("manager_delegate_pair_unique").on(table.managerId, table.delegateId) }));

export const managerWarehouseHeroAssignments = mysqlTable("manager_warehouse_hero_assignments", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull(),
  warehouseHeroId: int("warehouseHeroId").notNull(),
  assignedBy: int("assignedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ managerIdx: index("manager_warehouse_hero_manager_idx").on(table.managerId), heroIdx: index("manager_warehouse_hero_hero_idx").on(table.warehouseHeroId), pairUnique: uniqueIndex("manager_warehouse_hero_pair_unique").on(table.managerId, table.warehouseHeroId) }));

export const warehouseHeroLocations = mysqlTable("warehouse_hero_locations", {
  id: int("id").autoincrement().primaryKey(),
  warehouseHeroId: int("warehouseHeroId").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ heroUnique: uniqueIndex("warehouse_hero_location_unique").on(table.warehouseHeroId), capturedIdx: index("warehouse_hero_location_captured_idx").on(table.capturedAt) }));

export const warehouseDeliveryProofs = mysqlTable("warehouse_delivery_proofs", {
  id: int("id").autoincrement().primaryKey(),
  warehouseHeroId: int("warehouseHeroId").notNull(),
  note: text("note"),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ heroIdx: index("warehouse_delivery_proof_hero_idx").on(table.warehouseHeroId), capturedIdx: index("warehouse_delivery_proof_captured_idx").on(table.capturedAt) }));
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  role: mysqlEnum("role", ["user", "manager", "delegate", "warehouse_hero"]).default("delegate").notNull(),
  invitedBy: int("invitedBy").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ emailIdx: index("invitations_email_idx").on(table.email), expiresIdx: index("invitations_expires_idx").on(table.expiresAt) }));

export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 220 }).notNull(),
  province: varchar("province", { length: 120 }),
  city: varchar("city", { length: 120 }),
  address: text("address"),
  contactPerson: varchar("contactPerson", { length: 160 }),
  phone: varchar("phone", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ nameIdx: index("clients_name_idx").on(table.name), cityIdx: index("clients_city_idx").on(table.city) }));

export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  specialty: varchar("specialty", { length: 140 }),
  department: varchar("department", { length: 140 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  relationship: mysqlEnum("relationship", ["new", "warm", "kol", "cold"]).default("new").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ clientIdx: index("doctors_client_idx").on(table.clientId) }));

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  delegateId: int("delegateId").notNull(),
  clientId: int("clientId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ delegateIdx: index("tasks_delegate_idx").on(table.delegateId), scheduleIdx: index("tasks_schedule_idx").on(table.scheduledAt) }));

export const visits = mysqlTable("visits", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  checkInAt: timestamp("checkInAt"),
  checkOutAt: timestamp("checkOutAt"),
  checkInLat: decimal("checkInLat", { precision: 10, scale: 7 }),
  checkInLng: decimal("checkInLng", { precision: 10, scale: 7 }),
  checkOutLat: decimal("checkOutLat", { precision: 10, scale: 7 }),
  checkOutLng: decimal("checkOutLng", { precision: 10, scale: 7 }),
  report: text("report"),
  clientSignatureUrl: text("clientSignatureUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ taskIdx: uniqueIndex("visits_task_unique").on(table.taskId) }));

export const evidence = mysqlTable("evidence", {
  id: int("id").autoincrement().primaryKey(),
  visitId: int("visitId").notNull(),
  kind: mysqlEnum("kind", ["photo", "audio", "signature", "document"]).notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  sizeBytes: int("sizeBytes"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ visitIdx: index("evidence_visit_idx").on(table.visitId) }));

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
}, (table) => ({ recipientIdx: index("messages_recipient_idx").on(table.recipientId), createdIdx: index("messages_created_idx").on(table.createdAt) }));

export const surgeries = mysqlTable("surgeries", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  delegateId: int("delegateId").notNull(),
  surgeryDate: timestamp("surgeryDate").notNull(),
  hospital: varchar("hospital", { length: 220 }),
  surgeon: varchar("surgeon", { length: 180 }),
  procedureName: varchar("procedureName", { length: 220 }),
  status: mysqlEnum("status", ["pending", "partial", "collected"]).default("pending").notNull(),
  quotation: decimal("quotation", { precision: 12, scale: 2 }),
  invoice: decimal("invoice", { precision: 12, scale: 2 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const visitPlans = mysqlTable("visitPlans", {
  id: int("id").autoincrement().primaryKey(),
  delegateId: int("delegateId").notNull(),
  clientId: int("clientId").notNull(),
  proposedAt: timestamp("proposedAt").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ delegateIdx: index("visit_plans_delegate_idx").on(table.delegateId), statusIdx: index("visit_plans_status_idx").on(table.status) }));
export const geography = mysqlTable("geography", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["province", "city"]).notNull(),
  name: varchar("name", { length: 140 }).notNull(),
  parentId: int("parentId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ parentIdx: index("geography_parent_idx").on(table.parentId) }));

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: int("entityId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ actorIdx: index("audit_actor_idx").on(table.actorId), createdIdx: index("audit_created_idx").on(table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type WarehouseDeliveryProof = typeof warehouseDeliveryProofs.$inferSelect;
