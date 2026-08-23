import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  department: varchar("department", { length: 160 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "manager", "delegate", "warehouse_hero", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  pushNotifications: boolean("pushNotifications").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  locationSharing: boolean("locationSharing").default(false).notNull(),
}, (table) => ({ emailIdx: index("users_email_idx").on(table.email) }));

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  parentDepartmentId: int("parentDepartmentId"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ nameUnique: uniqueIndex("departments_name_unique").on(table.name), parentIdx: index("departments_parent_idx").on(table.parentDepartmentId) }));

export const superManagerReportFilterPresets = mysqlTable("super_manager_report_filter_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  query: varchar("query", { length: 160 }),
  role: mysqlEnum("role", ["manager", "delegate", "warehouse_hero"]),
  department: varchar("department", { length: 160 }),
  activityFrom: varchar("activityFrom", { length: 10 }),
  activityTo: varchar("activityTo", { length: 10 }),
  activityStatus: mysqlEnum("activityStatus", ["pending", "approved", "rejected", "submitted", "reviewed", "manager_recorded"]),
  isShared: boolean("isShared").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("super_manager_preset_user_idx").on(table.userId), userNameUnique: uniqueIndex("super_manager_preset_user_name_unique").on(table.userId, table.name) }));

export const monthlyDepartmentReportShares = mysqlTable("monthly_department_report_shares", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  createdBy: int("createdBy").notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  commentary: text("commentary"),
  reportPayload: text("reportPayload").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ creatorIdx: index("monthly_department_report_share_creator_idx").on(table.createdBy), expiryIdx: index("monthly_department_report_share_expiry_idx").on(table.expiresAt) }));

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
  captureSource: mysqlEnum("captureSource", ["legacy_upload", "live_camera"]).default("legacy_upload").notNull(),
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

export const userNotifications = mysqlTable("userNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  actorId: int("actorId"),
  kind: varchar("kind", { length: 120 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  entityType: varchar("entityType", { length: 80 }),
  entityId: int("entityId"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userReadIdx: index("user_notification_user_read_idx").on(table.userId, table.readAt), createdIdx: index("user_notification_created_idx").on(table.createdAt), entityIdx: index("user_notification_entity_idx").on(table.entityType, table.entityId) }));

export const surgeries = mysqlTable("surgeries", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),
  delegateId: int("delegateId").notNull(),
  surgeryDate: timestamp("surgeryDate").notNull(),
  notifiedAt: timestamp("notifiedAt").defaultNow().notNull(),
  calendarStatus: mysqlEnum("calendarStatus", ["notified", "confirmed", "postponed", "cancelled", "completed"]).default("notified").notNull(),
  lifecycleReason: text("lifecycleReason"),
  lifecycleUpdatedAt: timestamp("lifecycleUpdatedAt"),
  hospitalConfirmed: boolean("hospitalConfirmed").default(false).notNull(),
  implantsAvailable: boolean("implantsAvailable").default(false).notNull(),
  delegateReady: boolean("delegateReady").default(false).notNull(),
  deliveryPrepared: boolean("deliveryPrepared").default(false).notNull(),
  hospitalDelivered: boolean("hospitalDelivered").default(false).notNull(),
  readinessUpdatedAt: timestamp("readinessUpdatedAt"),
  readinessUpdatedBy: int("readinessUpdatedBy"),
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

export const implantCatalogue = mysqlTable("implantCatalogue", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 220 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 180 }),
  productCode: varchar("productCode", { length: 160 }),
  description: text("description"),
  source: varchar("source", { length: 260 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ nameIdx: index("implant_catalogue_name_idx").on(table.name), activeIdx: index("implant_catalogue_active_idx").on(table.isActive) }));

export const surgeryImplants = mysqlTable("surgeryImplants", {
  id: int("id").autoincrement().primaryKey(),
  surgeryId: int("surgeryId").notNull(),
  implantCatalogueId: int("implantCatalogueId"),
  implantName: varchar("implantName", { length: 220 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  lotNumber: varchar("lotNumber", { length: 160 }),
  serialNumber: varchar("serialNumber", { length: 160 }),
  notes: text("notes"),
  registeredBy: int("registeredBy").notNull(),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
}, (table) => ({ surgeryIdx: index("surgery_implants_surgery_idx").on(table.surgeryId) }));

export const surgeryDeliveryProofs = mysqlTable("surgeryDeliveryProofs", {
  id: int("id").autoincrement().primaryKey(),
  surgeryId: int("surgeryId").notNull(),
  storageKey: varchar("storageKey", { length: 500 }).notNull(),
  originalName: varchar("originalName", { length: 220 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  note: text("note"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ surgeryIdx: index("surgery_delivery_proofs_surgery_idx").on(table.surgeryId) }));

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

export const weeklyVisitPlans = mysqlTable("weeklyVisitPlans", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  delegateId: int("delegateId"),
  clientId: int("clientId").notNull(),
  doctorId: int("doctorId").notNull(),
  weekOf: timestamp("weekOf").notNull(),
  objectives: text("objectives").notNull(),
  plannedVisits: text("plannedVisits").notNull(),
  scheduleJson: text("scheduleJson").notNull(),
  supportNeeded: text("supportNeeded"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "manager_recorded"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ authorIdx: index("weekly_visit_plans_author_idx").on(table.authorId), delegateIdx: index("weekly_visit_plans_delegate_idx").on(table.delegateId), clientIdx: index("weekly_visit_plans_client_idx").on(table.clientId), doctorIdx: index("weekly_visit_plans_doctor_idx").on(table.doctorId), statusIdx: index("weekly_visit_plans_status_idx").on(table.status), weekIdx: index("weekly_visit_plans_week_idx").on(table.weekOf) }));

export const dailyActivityReports = mysqlTable("dailyActivityReports", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  delegateId: int("delegateId"),
  clientId: int("clientId").notNull(),
  doctorId: int("doctorId").notNull(),
  reportDate: timestamp("reportDate").notNull(),
  summary: text("summary").notNull(),
  outcomes: text("outcomes").notNull(),
  challenges: text("challenges"),
  nextActions: text("nextActions"),
  status: mysqlEnum("status", ["submitted", "reviewed", "manager_recorded"]).default("submitted").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  managerNote: text("managerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ authorIdx: index("daily_activity_reports_author_idx").on(table.authorId), delegateIdx: index("daily_activity_reports_delegate_idx").on(table.delegateId), clientIdx: index("daily_activity_reports_client_idx").on(table.clientId), doctorIdx: index("daily_activity_reports_doctor_idx").on(table.doctorId), statusIdx: index("daily_activity_reports_status_idx").on(table.status), dateIdx: index("daily_activity_reports_date_idx").on(table.reportDate) }));

export const travelExpenseClaims = mysqlTable("travelExpenseClaims", {
  id: int("id").autoincrement().primaryKey(),
  claimantId: int("claimantId").notNull(),
  managerApproverId: int("managerApproverId").notNull(),
  operationalApproverId: int("operationalApproverId").notNull(),
  claimDate: timestamp("claimDate").notNull(),
  department: varchar("department", { length: 160 }),
  jobNature: varchar("jobNature", { length: 240 }),
  transportMode: mysqlEnum("transportMode", ["car", "plane", "car_and_plane", "other"]).default("other").notNull(),
  ticketReference: varchar("ticketReference", { length: 180 }),
  estimatedDays: int("estimatedDays"),
  tripSegmentsJson: text("tripSegmentsJson").notNull(),
  jobReport: text("jobReport"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("SAR").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "released"]).default("pending").notNull(),
  managerApprovedAt: timestamp("managerApprovedAt"),
  operationalApprovedAt: timestamp("operationalApprovedAt"),
  releasedAt: timestamp("releasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ claimantIdx: index("travel_expense_claimant_idx").on(table.claimantId), managerApproverIdx: index("travel_expense_manager_approver_idx").on(table.managerApproverId), operationalApproverIdx: index("travel_expense_operational_approver_idx").on(table.operationalApproverId), statusIdx: index("travel_expense_status_idx").on(table.status), claimDateIdx: index("travel_expense_claim_date_idx").on(table.claimDate) }));

export const travelExpenseLines = mysqlTable("travelExpenseLines", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull(),
  category: mysqlEnum("category", ["hotel", "car_taxi", "fuel_invoice", "maintenance", "food", "air_ticket", "others"]).notNull(),
  description: varchar("description", { length: 240 }),
  days: int("days"),
  amountPerDay: decimal("amountPerDay", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  remarks: text("remarks"),
  distanceKm: int("distanceKm"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ claimIdx: index("travel_expense_line_claim_idx").on(table.claimId), categoryIdx: index("travel_expense_line_category_idx").on(table.category) }));

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

export const weeklyBackupReminderSchedules = mysqlTable("weeklyBackupReminderSchedules", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).notNull().unique(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ taskUidIdx: index("weekly_backup_reminder_task_uid_idx").on(table.scheduleCronTaskUid) }));

export const googleDriveBackupConnections = mysqlTable("googleDriveBackupConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  googleEmail: varchar("googleEmail", { length: 320 }),
  folderId: varchar("folderId", { length: 160 }).notNull(),
  encryptedRefreshToken: text("encryptedRefreshToken").notNull(),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdx: index("google_drive_backup_connection_user_idx").on(table.userId) }));

export const backupArchives = mysqlTable("backupArchives", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  googleDriveFileId: varchar("googleDriveFileId", { length: 160 }),
  fileName: varchar("fileName", { length: 300 }).notNull(),
  sizeBytes: int("sizeBytes"),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({ creatorIdx: index("backup_archive_creator_idx").on(table.createdBy), createdIdx: index("backup_archive_created_idx").on(table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Doctor = typeof doctors.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Visit = typeof visits.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type SurgeryImplant = typeof surgeryImplants.$inferSelect;
export type ImplantCatalogueItem = typeof implantCatalogue.$inferSelect;
export type SurgeryDeliveryProof = typeof surgeryDeliveryProofs.$inferSelect;
export type WarehouseDeliveryProof = typeof warehouseDeliveryProofs.$inferSelect;
