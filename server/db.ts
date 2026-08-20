import { and, count, desc, eq, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, invitations, clients, doctors, managerDelegateAssignments, tasks, visits, evidence, auditEvents, messages, surgeries, visitPlans, geography, clientErrorReports } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const ADMIN_EMAIL = "dr.seleam@gmail.com";
export function isProtectedAdminTarget(target: { email?: string | null; openId: string }, actorOpenId: string) { return target.email?.toLowerCase() === ADMIN_EMAIL || target.openId === actorOpenId; }
export function canUserUpdateTask(userRole: string, userId: number, delegateId: number) { return userRole !== "delegate" || userId === delegateId; }
export function canManagerAccessDelegate(userRole: string, managerId: number, delegateId: number, assignedDelegateIds: number[]) { return userRole !== "manager" || assignedDelegateIds.includes(delegateId); }
export function normalizeVisitReport(report: string) { return report.trim(); }
export function prepareVisitReport(report: string) { return { report: normalizeVisitReport(report) }; }
export function visitPlanStatusLabel(status: "pending" | "approved" | "rejected") { return status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending review"; }
export function operationalSummaryCsv(summary: { clients: number; tasks: number; completedTasks: number; pendingTasks: number }) { return `metric,value\nclients,${summary.clients}\ntasks,${summary.tasks}\ncompleted_tasks,${summary.completedTasks}\npending_tasks,${summary.pendingTasks}\n`; }

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

export async function updateNotificationPreferences(userId: number, input: { pushNotifications?: boolean; emailNotifications?: boolean; locationSharing?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set(input).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function listInvitations() { const db = await getDb(); if (!db) return []; return db.select().from(invitations).orderBy(invitations.createdAt); }

export async function listDelegates() { const db = await getDb(); if (!db) return []; return db.select().from(users).where(eq(users.role, "delegate")).orderBy(users.name); }
export async function listManagers() { const db = await getDb(); if (!db) return []; return db.select().from(users).where(eq(users.role, "manager")).orderBy(users.name); }
export async function listManagerAssignments() { const db = await getDb(); if (!db) return []; const [assignments, allUsers] = await Promise.all([db.select().from(managerDelegateAssignments).orderBy(managerDelegateAssignments.createdAt), db.select().from(users)]); const byId = new Map(allUsers.map((user) => [user.id, user])); return assignments.map((assignment) => ({ ...assignment, managerName: byId.get(assignment.managerId)?.name || byId.get(assignment.managerId)?.email || `Manager #${assignment.managerId}`, delegateName: byId.get(assignment.delegateId)?.name || byId.get(assignment.delegateId)?.email || `Delegate #${assignment.delegateId}`, managerEmail: byId.get(assignment.managerId)?.email || null, delegateEmail: byId.get(assignment.delegateId)?.email || null })); }
export async function createManagerDelegateAssignment(input: typeof managerDelegateAssignments.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(managerDelegateAssignments).values(input); return db.select().from(managerDelegateAssignments).where(eq(managerDelegateAssignments.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function removeManagerDelegateAssignment(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(managerDelegateAssignments).where(eq(managerDelegateAssignments.id, id)); return { success: true } as const; }
export async function isDelegateAssignedToManager(managerId: number, delegateId: number) { const db = await getDb(); if (!db) return false; const rows = await db.select({ id: managerDelegateAssignments.id }).from(managerDelegateAssignments).where(and(eq(managerDelegateAssignments.managerId, managerId), eq(managerDelegateAssignments.delegateId, delegateId))).limit(1); return rows.length > 0; }
export async function listDelegateIdsForManager(managerId: number) { const db = await getDb(); if (!db) return []; const rows = await db.select({ delegateId: managerDelegateAssignments.delegateId }).from(managerDelegateAssignments).where(eq(managerDelegateAssignments.managerId, managerId)); return rows.map((row) => row.delegateId); }
export async function listDelegatesForManager(managerId: number) { const ids = await listDelegateIdsForManager(managerId); if (!ids.length) return []; const delegates = await listDelegates(); return delegates.filter((delegate) => ids.includes(delegate.id)); }
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
export async function listVisitPlansForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; const plans = await listAllVisitPlans(); return plans.filter((plan) => allowed.includes(plan.delegateId)); }
export async function createVisitPlan(input: typeof visitPlans.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(visitPlans).values(input); return db.select().from(visitPlans).where(eq(visitPlans.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function updateVisitPlan(id: number, input: Partial<typeof visitPlans.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(visitPlans).set(input).where(eq(visitPlans.id, id)); return db.select().from(visitPlans).where(eq(visitPlans.id, id)).limit(1).then((rows) => rows[0]); }

export async function listSurgeriesForDelegate(delegateId: number) { const db = await getDb(); if (!db) return []; return db.select().from(surgeries).where(eq(surgeries.delegateId, delegateId)).orderBy(surgeries.surgeryDate); }
export async function listSurgeriesForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; const db = await getDb(); if (!db) return []; const rows = await db.select().from(surgeries).orderBy(surgeries.surgeryDate); return rows.filter((row) => allowed.includes(row.delegateId)); }
export async function createSurgery(input: typeof surgeries.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(surgeries).values(input); return db.select().from(surgeries).where(eq(surgeries.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function updateSurgery(id: number, input: Partial<typeof surgeries.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(surgeries).set(input).where(eq(surgeries.id, id)); return db.select().from(surgeries).where(eq(surgeries.id, id)).limit(1).then((rows) => rows[0]); }

export async function listMessages(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(messages).where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId))).orderBy(messages.createdAt); }
export async function createMessage(input: typeof messages.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(messages).values(input); return db.select().from(messages).where(eq(messages.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }

export async function listDoctors() { const db = await getDb(); if (!db) return []; return db.select().from(doctors).orderBy(doctors.name); }
export async function listGeography() { const db = await getDb(); if (!db) return []; return db.select().from(geography).orderBy(geography.kind, geography.name); }
export async function createDoctor(input: typeof doctors.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(doctors).values(input); return db.select().from(doctors).where(eq(doctors.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function getDoctorById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1); return rows[0]; }
export async function updateDoctor(id: number, input: Partial<typeof doctors.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(doctors).set(input).where(eq(doctors.id, id)); return getDoctorById(id); }
export async function removeDoctor(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(doctors).where(eq(doctors.id, id)); return { success: true } as const; }
export async function createGeography(input: typeof geography.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(geography).values(input); return db.select().from(geography).where(eq(geography.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function getGeographyById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(geography).where(eq(geography.id, id)).limit(1); return rows[0]; }
export async function updateGeography(id: number, input: Partial<typeof geography.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(geography).set(input).where(eq(geography.id, id)); return getGeographyById(id); }
export async function removeGeography(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(geography).where(eq(geography.id, id)); return { success: true } as const; }

export async function listClients() { const db = await getDb(); if (!db) return []; return db.select().from(clients).orderBy(clients.name); }
export async function createClient(input: typeof clients.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(clients).values(input); return getClientById(Number(result[0].insertId)); }
export async function updateClient(id: number, input: Partial<typeof clients.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(clients).set(input).where(eq(clients.id, id)); return getClientById(id); }
export async function removeClient(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(clients).where(eq(clients.id, id)); return { success: true } as const; }
export async function getClientById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1); return rows[0]; }
export async function listTasksForDelegate(delegateId: number) { const db = await getDb(); if (!db) return []; const [rows, clientRows] = await Promise.all([db.select().from(tasks).where(eq(tasks.delegateId, delegateId)).orderBy(tasks.scheduledAt), db.select().from(clients)]); const clientsById = new Map(clientRows.map((client) => [client.id, client])); return rows.map((task) => { const client = clientsById.get(task.clientId); return { ...task, clientName: client?.name ?? "Unassigned client", clientLatitude: client?.latitude ?? null, clientLongitude: client?.longitude ?? null, clientCity: client?.city ?? null }; }); }
export async function listAllTasks() { const db = await getDb(); if (!db) return []; const [rows, clientRows] = await Promise.all([db.select().from(tasks).orderBy(tasks.scheduledAt), db.select().from(clients)]); const clientsById = new Map(clientRows.map((client) => [client.id, client])); return rows.map((task) => { const client = clientsById.get(task.clientId); return { ...task, clientName: client?.name ?? "Unassigned client", clientLatitude: client?.latitude ?? null, clientLongitude: client?.longitude ?? null, clientCity: client?.city ?? null }; }); }
export async function listTasksForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; const all = await listAllTasks(); return all.filter((task) => allowed.includes(task.delegateId)); }
export async function createTask(input: typeof tasks.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(tasks).values(input); return getTaskById(Number(result[0].insertId)); }
export async function getTaskById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1); return rows[0]; }
export async function updateTaskStatus(id: number, status: "pending" | "in_progress" | "completed" | "cancelled") { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(tasks).set({ status }).where(eq(tasks.id, id)); return getTaskById(id); }
export async function getVisitByTaskId(taskId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(visits).where(eq(visits.taskId, taskId)).limit(1); return rows[0]; }
export async function upsertVisit(input: typeof visits.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const existing = await getVisitByTaskId(input.taskId); if (existing) { await db.update(visits).set(input).where(eq(visits.id, existing.id)); return getVisitByTaskId(input.taskId); } await db.insert(visits).values(input); return getVisitByTaskId(input.taskId); }
export async function addEvidence(input: typeof evidence.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(evidence).values(input); return result[0].insertId; }
export async function addAuditEvent(input: typeof auditEvents.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(auditEvents).values(input); }

export async function listAuditEvents(limit = 100) { const db = await getDb(); if (!db) return []; return db.select().from(auditEvents).limit(limit); }
export async function captureClientError(input: typeof clientErrorReports.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(clientErrorReports).values(input); }
export async function listClientErrors(limit = 100) { const db = await getDb(); if (!db) return []; return db.select().from(clientErrorReports).orderBy(desc(clientErrorReports.createdAt)).limit(limit); }
export async function getMonitoringHealth() { const db = await getDb(); if (!db) return { database: "unavailable" as const, auditEvents: 0, clientErrors: 0 }; const [audit, errors] = await Promise.all([db.select({ total: count() }).from(auditEvents), db.select({ total: count() }).from(clientErrorReports)]); return { database: "online" as const, auditEvents: Number(audit[0]?.total ?? 0), clientErrors: Number(errors[0]?.total ?? 0) }; }
export function filterTasksByDateRange<T extends { scheduledAt: Date }>(rows: T[], filters?: { from?: string; to?: string }) { const from = filters?.from ? new Date(filters.from) : undefined; const to = filters?.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined; return rows.filter((task) => (!from || task.scheduledAt >= from) && (!to || task.scheduledAt <= to)); }
export async function getOperationalSummary(filters?: { from?: string; to?: string; delegateIds?: number[] }) { const db = await getDb(); if (!db) return { clients: 0, tasks: 0, completedTasks: 0, pendingTasks: 0 }; const [clientRows, taskRows] = await Promise.all([db.select().from(clients), db.select().from(tasks)]); const assignedTasks = filters?.delegateIds ? taskRows.filter((task) => filters.delegateIds?.includes(task.delegateId)) : taskRows; const filteredTasks = filterTasksByDateRange(assignedTasks, filters); return { clients: clientRows.length, tasks: filteredTasks.length, completedTasks: filteredTasks.filter((task) => task.status === "completed").length, pendingTasks: filteredTasks.filter((task) => task.status === "pending").length }; }
