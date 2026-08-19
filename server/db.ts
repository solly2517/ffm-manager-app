import { and, eq, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, invitations, clients, doctors, tasks, visits, evidence, auditEvents, messages, surgeries, visitPlans, geography } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const ADMIN_EMAIL = "dr.seleam@gmail.com";
export function canUserUpdateTask(userRole: string, userId: number, delegateId: number) { return userRole !== "delegate" || userId === delegateId; }
export function normalizeVisitReport(report: string) { return report.trim(); }
export function visitPlanStatusLabel(status: "pending" | "approved" | "rejected") { return status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending review"; }

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const isProtectedAdmin = user.email?.toLowerCase() === ADMIN_EMAIL || user.openId === ENV.ownerOpenId;
  const values: InsertUser = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: user.lastSignedIn ?? new Date(), role: isProtectedAdmin ? "admin" : user.role ?? "user" };
  const updateSet: Record<string, unknown> = { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn };
  if (isProtectedAdmin) updateSet.role = "admin";
  const existingByEmail = values.email ? (await db.select().from(users).where(eq(users.email, values.email)).limit(1))[0] : undefined;
  if (existingByEmail && existingByEmail.openId !== user.openId) {
    await db.update(users).set({ openId: user.openId, ...updateSet, role: isProtectedAdmin ? "admin" : existingByEmail.role }).where(eq(users.id, existingByEmail.id));
    return;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function listInvitations() { const db = await getDb(); if (!db) return []; return db.select().from(invitations).orderBy(invitations.createdAt); }

export async function listDelegates() { const db = await getDb(); if (!db) return []; return db.select().from(users).where(eq(users.role, "delegate")).orderBy(users.name); }
export async function listUsers() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(users).orderBy(users.createdAt);
}

export async function upsertInvitedUser(input: { email: string; name?: string | null }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing[0]) return existing[0];
  const openId = `invite:${input.email}`;
  await db.insert(users).values({ openId, email: input.email, name: input.name ?? null, loginMethod: "admin-invite", role: "user" });
  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return created[0];
}

export async function updateUserRole(id: number, role: "user" | "manager" | "delegate" | "admin") {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
  return getUserById(id);
}

export async function removeUser(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.delete(users).where(eq(users.id, id));
}


export function mergePendingInvitation<T extends { id: number; acceptedAt: Date | null; expiresAt: Date; role: "user" | "manager" | "delegate"; tokenHash: string; invitedBy: number }>(existing: T, input: { role: T["role"]; tokenHash: string; invitedBy: number; expiresAt: Date }) { return existing.acceptedAt === null && existing.expiresAt > new Date() ? { ...existing, ...input } : null; }

export async function createInvitation(input: { email: string; role: "user" | "manager" | "delegate"; invitedBy: number; tokenHash: string; expiresAt: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(invitations).where(eq(invitations.email, input.email)).limit(1);
  const merged = existing[0] && mergePendingInvitation(existing[0], input);
  if (merged) {
    await db.update(invitations).set({ role: merged.role, tokenHash: merged.tokenHash, invitedBy: merged.invitedBy, expiresAt: merged.expiresAt }).where(eq(invitations.id, existing[0].id));
    return (await db.select().from(invitations).where(eq(invitations.id, existing[0].id)).limit(1))[0];
  }
  await db.insert(invitations).values(input);
  const created = await db.select().from(invitations).where(eq(invitations.tokenHash, input.tokenHash)).limit(1);
  return created[0];
}

export async function getInvitationByHash(tokenHash: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash)).limit(1);
  return rows[0];
}

export async function acceptInvitation(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(invitations).set({ acceptedAt: new Date() }).where(eq(invitations.id, id));
}

export async function listVisitPlansForDelegate(delegateId: number) { const db = await getDb(); if (!db) return []; return db.select({ id: visitPlans.id, delegateId: visitPlans.delegateId, clientId: visitPlans.clientId, proposedAt: visitPlans.proposedAt, notes: visitPlans.notes, status: visitPlans.status, reviewedBy: visitPlans.reviewedBy, reviewedAt: visitPlans.reviewedAt, createdAt: visitPlans.createdAt, reviewerName: users.name, reviewerEmail: users.email }).from(visitPlans).leftJoin(users, eq(visitPlans.reviewedBy, users.id)).where(eq(visitPlans.delegateId, delegateId)).orderBy(visitPlans.proposedAt); }
export async function listAllVisitPlans() { const db = await getDb(); if (!db) return []; return db.select({ id: visitPlans.id, delegateId: visitPlans.delegateId, clientId: visitPlans.clientId, proposedAt: visitPlans.proposedAt, notes: visitPlans.notes, status: visitPlans.status, reviewedBy: visitPlans.reviewedBy, reviewedAt: visitPlans.reviewedAt, createdAt: visitPlans.createdAt, reviewerName: users.name, reviewerEmail: users.email }).from(visitPlans).leftJoin(users, eq(visitPlans.reviewedBy, users.id)).orderBy(visitPlans.proposedAt); }
export async function createVisitPlan(input: typeof visitPlans.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(visitPlans).values(input); return db.select().from(visitPlans).where(eq(visitPlans.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function updateVisitPlan(id: number, input: Partial<typeof visitPlans.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(visitPlans).set(input).where(eq(visitPlans.id, id)); return db.select().from(visitPlans).where(eq(visitPlans.id, id)).limit(1).then((rows) => rows[0]); }

export async function listSurgeriesForDelegate(delegateId: number) { const db = await getDb(); if (!db) return []; return db.select().from(surgeries).where(eq(surgeries.delegateId, delegateId)).orderBy(surgeries.surgeryDate); }
export async function createSurgery(input: typeof surgeries.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(surgeries).values(input); return db.select().from(surgeries).where(eq(surgeries.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function updateSurgery(id: number, input: Partial<typeof surgeries.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(surgeries).set(input).where(eq(surgeries.id, id)); return db.select().from(surgeries).where(eq(surgeries.id, id)).limit(1).then((rows) => rows[0]); }

export async function listMessages(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(messages).where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId))).orderBy(messages.createdAt); }
export async function createMessage(input: typeof messages.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(messages).values(input); return db.select().from(messages).where(eq(messages.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }

export async function listDoctors() { const db = await getDb(); if (!db) return []; return db.select().from(doctors).orderBy(doctors.name); }
export async function listGeography() { const db = await getDb(); if (!db) return []; return db.select().from(geography).orderBy(geography.kind, geography.name); }
export async function createDoctor(input: typeof doctors.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(doctors).values(input); return db.select().from(doctors).where(eq(doctors.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function createGeography(input: typeof geography.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(geography).values(input); return db.select().from(geography).where(eq(geography.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }

export async function listClients() { const db = await getDb(); if (!db) return []; return db.select().from(clients).orderBy(clients.name); }
export async function createClient(input: typeof clients.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(clients).values(input); return getClientById(Number(result[0].insertId)); }
export async function getClientById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1); return rows[0]; }
export async function listTasksForDelegate(delegateId: number) { const db = await getDb(); if (!db) return []; const [rows, clientRows] = await Promise.all([db.select().from(tasks).where(eq(tasks.delegateId, delegateId)).orderBy(tasks.scheduledAt), db.select().from(clients)]); const clientsById = new Map(clientRows.map((client) => [client.id, client])); return rows.map((task) => { const client = clientsById.get(task.clientId); return { ...task, clientName: client?.name ?? "Unassigned client", clientLatitude: client?.latitude ?? null, clientLongitude: client?.longitude ?? null, clientCity: client?.city ?? null }; }); }
export async function listAllTasks() { const db = await getDb(); if (!db) return []; const [rows, clientRows] = await Promise.all([db.select().from(tasks).orderBy(tasks.scheduledAt), db.select().from(clients)]); const clientsById = new Map(clientRows.map((client) => [client.id, client])); return rows.map((task) => { const client = clientsById.get(task.clientId); return { ...task, clientName: client?.name ?? "Unassigned client", clientLatitude: client?.latitude ?? null, clientLongitude: client?.longitude ?? null, clientCity: client?.city ?? null }; }); }
export async function createTask(input: typeof tasks.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(tasks).values(input); return getTaskById(Number(result[0].insertId)); }
export async function getTaskById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1); return rows[0]; }
export async function updateTaskStatus(id: number, status: "pending" | "in_progress" | "completed" | "cancelled") { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(tasks).set({ status }).where(eq(tasks.id, id)); return getTaskById(id); }
export async function getVisitByTaskId(taskId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(visits).where(eq(visits.taskId, taskId)).limit(1); return rows[0]; }
export async function upsertVisit(input: typeof visits.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const existing = await getVisitByTaskId(input.taskId); if (existing) { await db.update(visits).set(input).where(eq(visits.id, existing.id)); return getVisitByTaskId(input.taskId); } await db.insert(visits).values(input); return getVisitByTaskId(input.taskId); }
export async function addEvidence(input: typeof evidence.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(evidence).values(input); return result[0].insertId; }
export async function addAuditEvent(input: typeof auditEvents.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(auditEvents).values(input); }

export async function listAuditEvents(limit = 100) { const db = await getDb(); if (!db) return []; return db.select().from(auditEvents).limit(limit); }
export function filterTasksByDateRange<T extends { scheduledAt: Date }>(rows: T[], filters?: { from?: string; to?: string }) { const from = filters?.from ? new Date(filters.from) : undefined; const to = filters?.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined; return rows.filter((task) => (!from || task.scheduledAt >= from) && (!to || task.scheduledAt <= to)); }
export async function getOperationalSummary(filters?: { from?: string; to?: string }) { const db = await getDb(); if (!db) return { clients: 0, tasks: 0, completedTasks: 0, pendingTasks: 0 }; const [clientRows, taskRows] = await Promise.all([db.select().from(clients), db.select().from(tasks)]); const filteredTasks = filterTasksByDateRange(taskRows, filters); return { clients: clientRows.length, tasks: filteredTasks.length, completedTasks: filteredTasks.filter((task) => task.status === "completed").length, pendingTasks: filteredTasks.filter((task) => task.status === "pending").length }; }
