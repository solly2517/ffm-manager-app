import { and, count, desc, eq, isNull, like, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, invitations, clients, doctors, managerDelegateAssignments, managerWarehouseHeroAssignments, warehouseHeroLocations, warehouseDeliveryProofs, tasks, visits, evidence, auditEvents, messages, userNotifications, surgeries, implantCatalogue, surgeryImplants, surgeryDeliveryProofs, visitPlans, geography, clientErrorReports, weeklyBackupReminderSchedules } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const ADMIN_EMAIL = "dr.seleam@gmail.com";
export function isProtectedAdminTarget(target: { email?: string | null; openId: string }, actorOpenId: string) { return target.email?.toLowerCase() === ADMIN_EMAIL || target.openId === actorOpenId; }
export function canUserUpdateTask(userRole: string, userId: number, delegateId: number) { return userRole !== "delegate" || userId === delegateId; }
export function canManagerAccessDelegate(userRole: string, managerId: number, delegateId: number, assignedDelegateIds: number[]) { return userRole !== "manager" || assignedDelegateIds.includes(delegateId); }
export function normalizeVisitReport(report: string) { return report.trim(); }
export function prepareVisitReport(report: string) { return { report: normalizeVisitReport(report) }; }
export function buildUserRefreshUpdateSet(user: InsertUser, lastSignedIn: Date, isProtectedAdmin = false) { const updateSet: Record<string, unknown> = { lastSignedIn }; if (user.name !== undefined) updateSet.name = user.name; if (user.email !== undefined) updateSet.email = user.email; if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod; if (isProtectedAdmin) updateSet.role = "admin"; return updateSet; }
export function visitPlanStatusLabel(status: "pending" | "approved" | "rejected") { return status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending review"; }
export function operationalSummaryCsv(summary: { clients: number; tasks: number; completedTasks: number; pendingTasks: number }) { return `metric,value\nclients,${summary.clients}\ntasks,${summary.tasks}\ncompleted_tasks,${summary.completedTasks}\npending_tasks,${summary.pendingTasks}\n`; }
export function warehouseDeliveryProofsCsv(proofs: Array<{ id: number; warehouseHeroName?: string | null; warehouseHeroEmail?: string | null; note?: string | null; mimeType: string; sizeBytes: number; capturedAt: Date; url: string }>) { const cell = (value: string | number | null | undefined) => { const raw = String(value ?? ""); const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw; return `"${safe.replace(/"/g, '""')}"`; }; const header = "proof_id,warehouse_hero,note,mime_type,size_bytes,captured_at,photo_url"; const rows = proofs.map((proof) => [proof.id, proof.warehouseHeroName || proof.warehouseHeroEmail || "Warehouse Hero", proof.note, proof.mimeType, proof.sizeBytes, proof.capturedAt.toISOString(), proof.url].map(cell).join(",")); return `${header}\n${rows.join("\n")}${rows.length ? "\n" : ""}`; }

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
  const updateSet = buildUserRefreshUpdateSet(user, values.lastSignedIn!, isProtectedAdmin);
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
export async function listWarehouseHeroes() { const db = await getDb(); if (!db) return []; return db.select().from(users).where(eq(users.role, "warehouse_hero")).orderBy(users.name); }
export async function listManagers() { const db = await getDb(); if (!db) return []; return db.select().from(users).where(eq(users.role, "manager")).orderBy(users.name); }
export async function listManagerAssignments() { const db = await getDb(); if (!db) return []; const [assignments, allUsers] = await Promise.all([db.select().from(managerDelegateAssignments).orderBy(managerDelegateAssignments.createdAt), db.select().from(users)]); const byId = new Map(allUsers.map((user) => [user.id, user])); return assignments.map((assignment) => ({ ...assignment, managerName: byId.get(assignment.managerId)?.name || byId.get(assignment.managerId)?.email || "Unassigned Manager", delegateName: byId.get(assignment.delegateId)?.name || byId.get(assignment.delegateId)?.email || "Unassigned Delegate", managerEmail: byId.get(assignment.managerId)?.email || null, delegateEmail: byId.get(assignment.delegateId)?.email || null })); }
export async function createManagerDelegateAssignment(input: typeof managerDelegateAssignments.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(managerDelegateAssignments).values(input); return db.select().from(managerDelegateAssignments).where(eq(managerDelegateAssignments.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function removeManagerDelegateAssignment(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(managerDelegateAssignments).where(eq(managerDelegateAssignments.id, id)); return { success: true } as const; }
export async function isDelegateAssignedToManager(managerId: number, delegateId: number) { const db = await getDb(); if (!db) return false; const rows = await db.select({ id: managerDelegateAssignments.id }).from(managerDelegateAssignments).where(and(eq(managerDelegateAssignments.managerId, managerId), eq(managerDelegateAssignments.delegateId, delegateId))).limit(1); return rows.length > 0; }
export async function listDelegateIdsForManager(managerId: number) { const db = await getDb(); if (!db) return []; const rows = await db.select({ delegateId: managerDelegateAssignments.delegateId }).from(managerDelegateAssignments).where(eq(managerDelegateAssignments.managerId, managerId)); return rows.map((row) => row.delegateId); }
export async function listDelegatesForManager(managerId: number) { const ids = await listDelegateIdsForManager(managerId); if (!ids.length) return []; const delegates = await listDelegates(); return delegates.filter((delegate) => ids.includes(delegate.id)); }
export async function listManagerWarehouseHeroAssignments() { const db = await getDb(); if (!db) return []; const [assignments, allUsers] = await Promise.all([db.select().from(managerWarehouseHeroAssignments).orderBy(managerWarehouseHeroAssignments.createdAt), db.select().from(users)]); const byId = new Map(allUsers.map((user) => [user.id, user])); return assignments.map((assignment) => ({ ...assignment, managerName: byId.get(assignment.managerId)?.name || byId.get(assignment.managerId)?.email || "Unassigned Manager", warehouseHeroName: byId.get(assignment.warehouseHeroId)?.name || byId.get(assignment.warehouseHeroId)?.email || "Unassigned Warehouse Hero", managerEmail: byId.get(assignment.managerId)?.email || null, warehouseHeroEmail: byId.get(assignment.warehouseHeroId)?.email || null })); }
export async function createManagerWarehouseHeroAssignment(input: typeof managerWarehouseHeroAssignments.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(managerWarehouseHeroAssignments).values(input); return db.select().from(managerWarehouseHeroAssignments).where(eq(managerWarehouseHeroAssignments.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function removeManagerWarehouseHeroAssignment(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(managerWarehouseHeroAssignments).where(eq(managerWarehouseHeroAssignments.id, id)); return { success: true } as const; }
export async function isWarehouseHeroAssignedToManager(managerId: number, warehouseHeroId: number) { const db = await getDb(); if (!db) return false; const rows = await db.select({ id: managerWarehouseHeroAssignments.id }).from(managerWarehouseHeroAssignments).where(and(eq(managerWarehouseHeroAssignments.managerId, managerId), eq(managerWarehouseHeroAssignments.warehouseHeroId, warehouseHeroId))).limit(1); return rows.length > 0; }
export async function hasManagerForWarehouseHero(warehouseHeroId: number) { const db = await getDb(); if (!db) return false; const rows = await db.select({ id: managerWarehouseHeroAssignments.id }).from(managerWarehouseHeroAssignments).where(eq(managerWarehouseHeroAssignments.warehouseHeroId, warehouseHeroId)).limit(1); return rows.length > 0; }
export async function listWarehouseHeroIdsForManager(managerId: number) { const db = await getDb(); if (!db) return []; const rows = await db.select({ warehouseHeroId: managerWarehouseHeroAssignments.warehouseHeroId }).from(managerWarehouseHeroAssignments).where(eq(managerWarehouseHeroAssignments.managerId, managerId)); return rows.map((row) => row.warehouseHeroId); }
export async function listWarehouseHeroesForManager(managerId: number) { const ids = await listWarehouseHeroIdsForManager(managerId); if (!ids.length) return []; const heroes = await listWarehouseHeroes(); return heroes.filter((hero) => ids.includes(hero.id)); }
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

export async function activateInvitedUser(input: { email: string; role: "user" | "manager" | "delegate" | "warehouse_hero" }) {
  const email = input.email.toLowerCase();
  const user = await upsertInvitedUser({ email });
  if (!user) throw new Error("Unable to create invited user");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ role: input.role, loginMethod: "ffm-magic-link", lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return getUserById(user.id);
}

export async function updateUserRole(id: number, role: "user" | "manager" | "delegate" | "warehouse_hero" | "admin") {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
  return getUserById(id);
}

export async function updateUserDisplayName(id: number, name: string) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(users).set({ name }).where(eq(users.id, id));
  return getUserById(id);
}

export async function removeUser(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.delete(users).where(eq(users.id, id));
}


export function mergePendingInvitation<T extends { id: number; acceptedAt: Date | null; expiresAt: Date; role: "user" | "manager" | "delegate" | "warehouse_hero"; tokenHash: string; invitedBy: number }>(existing: T, input: { role: T["role"]; tokenHash: string; invitedBy: number; expiresAt: Date }) { return existing.acceptedAt === null && existing.expiresAt > new Date() ? { ...existing, ...input } : null; }

export async function createInvitation(input: { email: string; role: "user" | "manager" | "delegate" | "warehouse_hero"; invitedBy: number; tokenHash: string; expiresAt: Date }) {
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

export async function listVisitPlansForDelegate(delegateId: number) { return (await listAllVisitPlans()).filter((plan) => plan.delegateId === delegateId); }
export async function listAllVisitPlans() { const db = await getDb(); if (!db) return []; const [plans, people] = await Promise.all([db.select().from(visitPlans).orderBy(visitPlans.proposedAt), db.select().from(users)]); const peopleById = new Map(people.map((person) => [person.id, person])); return plans.map((plan) => { const delegate = peopleById.get(plan.delegateId); const reviewer = plan.reviewedBy ? peopleById.get(plan.reviewedBy) : undefined; return { ...plan, delegateName: delegate?.name || delegate?.email || "Unassigned Delegate", delegateEmail: delegate?.email || null, reviewerName: reviewer?.name || reviewer?.email || null, reviewerEmail: reviewer?.email || null }; }); }
export async function listVisitPlansForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; const plans = await listAllVisitPlans(); return plans.filter((plan) => allowed.includes(plan.delegateId)); }
export async function createVisitPlan(input: typeof visitPlans.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(visitPlans).values(input); return db.select().from(visitPlans).where(eq(visitPlans.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function getVisitPlanById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(visitPlans).where(eq(visitPlans.id, id)).limit(1); return rows[0]; }
export async function updateVisitPlan(id: number, input: Partial<typeof visitPlans.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(visitPlans).set(input).where(eq(visitPlans.id, id)); return db.select().from(visitPlans).where(eq(visitPlans.id, id)).limit(1).then((rows) => rows[0]); }

export async function listLiveDelegatePositionsForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; const db = await getDb(); if (!db) return []; const rows = await db.select({ delegateId: tasks.delegateId, delegateName: users.name, delegateEmail: users.email, locationSharing: users.locationSharing, checkInAt: visits.checkInAt, checkOutAt: visits.checkOutAt, checkInLat: visits.checkInLat, checkInLng: visits.checkInLng, checkOutLat: visits.checkOutLat, checkOutLng: visits.checkOutLng, updatedAt: visits.updatedAt }).from(visits).innerJoin(tasks, eq(visits.taskId, tasks.id)).innerJoin(users, eq(tasks.delegateId, users.id)).where(eq(users.locationSharing, true)).orderBy(desc(visits.updatedAt)); const latest = new Map<number, typeof rows[number]>(); for (const row of rows) if (allowed.includes(row.delegateId) && !latest.has(row.delegateId)) latest.set(row.delegateId, row); return Array.from(latest.values()).flatMap((row) => { const latitude = row.checkOutLat ?? row.checkInLat; const longitude = row.checkOutLng ?? row.checkInLng; if (latitude == null || longitude == null) return []; return [{ delegateId: row.delegateId, delegateName: row.delegateName, delegateEmail: row.delegateEmail, latitude, longitude, capturedAt: row.checkOutAt ?? row.checkInAt ?? row.updatedAt }]; }); }
export async function upsertWarehouseHeroLocation(input: typeof warehouseHeroLocations.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const existing = (await db.select().from(warehouseHeroLocations).where(eq(warehouseHeroLocations.warehouseHeroId, input.warehouseHeroId)).limit(1))[0]; if (existing) { await db.update(warehouseHeroLocations).set({ latitude: input.latitude, longitude: input.longitude, capturedAt: input.capturedAt ?? new Date() }).where(eq(warehouseHeroLocations.id, existing.id)); return (await db.select().from(warehouseHeroLocations).where(eq(warehouseHeroLocations.id, existing.id)).limit(1))[0]; } const result = await db.insert(warehouseHeroLocations).values(input); return (await db.select().from(warehouseHeroLocations).where(eq(warehouseHeroLocations.id, Number(result[0].insertId))).limit(1))[0]; }
export async function getWarehouseHeroLocation(warehouseHeroId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(warehouseHeroLocations).where(eq(warehouseHeroLocations.warehouseHeroId, warehouseHeroId)).limit(1))[0]; }
export async function listWarehouseHeroLocationsForManager(managerId: number, includeAll = false) { const allowed = includeAll ? undefined : await listWarehouseHeroIdsForManager(managerId); if (!includeAll && !allowed?.length) return []; const db = await getDb(); if (!db) return []; const rows = await db.select({ warehouseHeroId: warehouseHeroLocations.warehouseHeroId, warehouseHeroName: users.name, warehouseHeroEmail: users.email, latitude: warehouseHeroLocations.latitude, longitude: warehouseHeroLocations.longitude, capturedAt: warehouseHeroLocations.capturedAt, locationSharing: users.locationSharing }).from(warehouseHeroLocations).innerJoin(users, eq(warehouseHeroLocations.warehouseHeroId, users.id)).where(eq(users.locationSharing, true)).orderBy(desc(warehouseHeroLocations.capturedAt)); return rows.filter((row) => includeAll || allowed?.includes(row.warehouseHeroId)); }
export async function listSharedWarehouseHeroLocations() { return listWarehouseHeroLocationsForManager(0, true); }
export async function createWarehouseDeliveryProof(input: typeof warehouseDeliveryProofs.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(warehouseDeliveryProofs).values(input); return (await db.select().from(warehouseDeliveryProofs).where(eq(warehouseDeliveryProofs.id, Number(result[0].insertId))).limit(1))[0]; }
export async function listWarehouseDeliveryProofsForManager(managerId: number, includeAll = false, dateRange?: { from?: string; to?: string }) { const allowed = includeAll ? undefined : await listWarehouseHeroIdsForManager(managerId); if (!includeAll && !allowed?.length) return []; const start = dateRange?.from ? new Date(`${dateRange.from}T00:00:00.000Z`) : undefined; const end = dateRange?.to ? new Date(`${dateRange.to}T23:59:59.999Z`) : undefined; const db = await getDb(); if (!db) return []; const rows = await db.select({ id: warehouseDeliveryProofs.id, warehouseHeroId: warehouseDeliveryProofs.warehouseHeroId, warehouseHeroName: users.name, warehouseHeroEmail: users.email, note: warehouseDeliveryProofs.note, storageKey: warehouseDeliveryProofs.storageKey, mimeType: warehouseDeliveryProofs.mimeType, sizeBytes: warehouseDeliveryProofs.sizeBytes, capturedAt: warehouseDeliveryProofs.capturedAt }).from(warehouseDeliveryProofs).innerJoin(users, eq(warehouseDeliveryProofs.warehouseHeroId, users.id)).orderBy(desc(warehouseDeliveryProofs.capturedAt)); return rows.filter((row) => (includeAll || allowed?.includes(row.warehouseHeroId)) && (!start || row.capturedAt >= start) && (!end || row.capturedAt <= end)).map((row) => ({ ...row, url: `/manus-storage/${row.storageKey}` })); }
export async function listSharedWarehouseDeliveryProofs(dateRange?: { from?: string; to?: string }) { return listWarehouseDeliveryProofsForManager(0, true, dateRange); }
export async function listWarehouseDeliveryProofsForHero(warehouseHeroId: number) { const db = await getDb(); if (!db) return []; return (await db.select({ id: warehouseDeliveryProofs.id, note: warehouseDeliveryProofs.note, storageKey: warehouseDeliveryProofs.storageKey, mimeType: warehouseDeliveryProofs.mimeType, sizeBytes: warehouseDeliveryProofs.sizeBytes, capturedAt: warehouseDeliveryProofs.capturedAt }).from(warehouseDeliveryProofs).where(eq(warehouseDeliveryProofs.warehouseHeroId, warehouseHeroId)).orderBy(desc(warehouseDeliveryProofs.capturedAt))).map((row) => ({ ...row, url: `/manus-storage/${row.storageKey}` })); }

export async function listSurgeriesForDelegate(delegateId: number) { return (await listAllSurgeries()).filter((surgery) => surgery.delegateId === delegateId); }
export async function listSurgeriesForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; return (await listAllSurgeries()).filter((surgery) => allowed.includes(surgery.delegateId)); }
export async function listAllSurgeries() { const db = await getDb(); if (!db) return []; const [records, people] = await Promise.all([db.select().from(surgeries).orderBy(surgeries.surgeryDate), db.select().from(users)]); const peopleById = new Map(people.map((person) => [person.id, person])); return records.map((surgery) => { const delegate = peopleById.get(surgery.delegateId); return { ...surgery, delegateName: delegate?.name || delegate?.email || "Unassigned Delegate", delegateEmail: delegate?.email || null }; }); }
export async function createSurgery(input: typeof surgeries.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(surgeries).values(input); return db.select().from(surgeries).where(eq(surgeries.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function getSurgeryById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(surgeries).where(eq(surgeries.id, id)).limit(1); return rows[0]; }
export async function updateSurgery(id: number, input: Partial<typeof surgeries.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(surgeries).set(input).where(eq(surgeries.id, id)); return db.select().from(surgeries).where(eq(surgeries.id, id)).limit(1).then((rows) => rows[0]); }
export async function removeSurgeryWithResources(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const [implantRows, proofRows] = await Promise.all([db.select({ id: surgeryImplants.id }).from(surgeryImplants).where(eq(surgeryImplants.surgeryId, id)), db.select({ id: surgeryDeliveryProofs.id }).from(surgeryDeliveryProofs).where(eq(surgeryDeliveryProofs.surgeryId, id))]); await db.transaction(async (tx) => { await tx.delete(surgeryImplants).where(eq(surgeryImplants.surgeryId, id)); await tx.delete(surgeryDeliveryProofs).where(eq(surgeryDeliveryProofs.surgeryId, id)); await tx.delete(surgeries).where(eq(surgeries.id, id)); }); return { success: true as const, implantsRemoved: implantRows.length, deliveryProofsRemoved: proofRows.length }; }
export async function listImplantCatalogue(includeInactive = false) { const db = await getDb(); if (!db) return []; const rows = await db.select().from(implantCatalogue).orderBy(implantCatalogue.name); return includeInactive ? rows : rows.filter((item) => item.isActive); }
export async function searchImplantCatalogue(query = "", limit = 100) { const db = await getDb(); if (!db) return []; const safeLimit = Math.min(Math.max(limit, 1), 200); const term = query.trim(); if (!term) return db.select().from(implantCatalogue).where(eq(implantCatalogue.isActive, true)).orderBy(implantCatalogue.name).limit(safeLimit); const pattern = `%${term}%`; return db.select().from(implantCatalogue).where(and(eq(implantCatalogue.isActive, true), or(like(implantCatalogue.name, pattern), like(implantCatalogue.productCode, pattern), like(implantCatalogue.manufacturer, pattern)))).orderBy(implantCatalogue.name).limit(safeLimit); }
export async function getImplantCatalogueItem(id: number) { const db = await getDb(); if (!db) return undefined; return db.select().from(implantCatalogue).where(eq(implantCatalogue.id, id)).limit(1).then((rows) => rows[0]); }
export async function createImplantCatalogueItem(input: typeof implantCatalogue.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(implantCatalogue).values(input); return db.select().from(implantCatalogue).where(eq(implantCatalogue.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export function calculateSurgeryImplantTotals(implants: Array<{ quantity: number; unitPrice?: number | string | null; currency?: string | null }>) { const totalsByCurrency: Record<string, number> = {}; for (const implant of implants) { const unitPrice = Number(implant.unitPrice ?? 0); const lineTotal = Number.isFinite(unitPrice) ? Number((unitPrice * implant.quantity).toFixed(2)) : 0; const currency = (implant.currency || "SAR").toUpperCase(); totalsByCurrency[currency] = Number(((totalsByCurrency[currency] ?? 0) + lineTotal).toFixed(2)); } return Object.entries(totalsByCurrency).map(([currency, total]) => ({ currency, total })); }
export async function listSurgeryImplants(surgeryId: number) { const db = await getDb(); if (!db) return []; const [rows, catalogue] = await Promise.all([db.select().from(surgeryImplants).where(eq(surgeryImplants.surgeryId, surgeryId)).orderBy(desc(surgeryImplants.registeredAt)), listImplantCatalogue(true)]); const catalogueById = new Map(catalogue.map((item) => [item.id, item])); return rows.map((implant) => { const unitPrice = Number(implant.unitPrice ?? 0); const lineTotal = Number.isFinite(unitPrice) ? Number((unitPrice * implant.quantity).toFixed(2)) : 0; const productCode = implant.implantCatalogueId ? catalogueById.get(implant.implantCatalogueId)?.productCode ?? null : null; return { ...implant, unitPrice, currency: (implant.currency || "SAR").toUpperCase(), lineTotal, productCode, catalogueName: implant.implantCatalogueId ? catalogueById.get(implant.implantCatalogueId)?.name ?? null : null, catalogueManufacturer: implant.implantCatalogueId ? catalogueById.get(implant.implantCatalogueId)?.manufacturer ?? null : null, catalogueProductCode: productCode }; }); }
export async function createSurgeryImplant(input: typeof surgeryImplants.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(surgeryImplants).values(input); return db.select().from(surgeryImplants).where(eq(surgeryImplants.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function listSurgeryDeliveryProofs(surgeryId: number) { const db = await getDb(); if (!db) return []; return (await db.select().from(surgeryDeliveryProofs).where(eq(surgeryDeliveryProofs.surgeryId, surgeryId)).orderBy(desc(surgeryDeliveryProofs.createdAt))).map((proof) => ({ ...proof, url: `/manus-storage/${proof.storageKey}` })); }
export async function createSurgeryDeliveryProof(input: typeof surgeryDeliveryProofs.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(surgeryDeliveryProofs).values(input); return db.select().from(surgeryDeliveryProofs).where(eq(surgeryDeliveryProofs.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }

export async function listMessages(userId: number) { const db = await getDb(); if (!db) return []; const [messageRows, people] = await Promise.all([db.select().from(messages).where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId))).orderBy(messages.createdAt), db.select().from(users)]); const peopleById = new Map(people.map((person) => [person.id, person])); return messageRows.map((message) => { const sender = peopleById.get(message.senderId); const recipient = message.recipientId ? peopleById.get(message.recipientId) : undefined; return { ...message, senderName: sender?.name || sender?.email || "Unknown user", senderEmail: sender?.email || null, senderRole: sender?.role || null, recipientName: recipient?.name || recipient?.email || null, recipientEmail: recipient?.email || null, recipientRole: recipient?.role || null }; }); }
export async function listMessageRecipients(userId: number) { const db = await getDb(); if (!db) return []; const people = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name, users.email); return people.filter((person) => person.id !== userId).map((person) => ({ ...person, displayName: person.name || person.email || "Unnamed member" })); }
export async function createMessage(input: typeof messages.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(messages).values(input); return db.select().from(messages).where(eq(messages.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function markMessagesRead(recipientId: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.update(messages).set({ readAt: new Date() }).where(and(eq(messages.recipientId, recipientId), isNull(messages.readAt))); return { updated: Number(result[0]?.affectedRows ?? 0) }; }

export async function listDoctors() { const db = await getDb(); if (!db) return []; return db.select().from(doctors).orderBy(doctors.name); }
export async function listGeography() { const db = await getDb(); if (!db) return []; return db.select().from(geography).orderBy(geography.kind, geography.name); }
export async function createDoctor(input: typeof doctors.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(doctors).values(input); return db.select().from(doctors).where(eq(doctors.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function getDoctorById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(doctors).where(eq(doctors.id, id)).limit(1); return rows[0]; }
export async function updateDoctor(id: number, input: Partial<typeof doctors.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(doctors).set(input).where(eq(doctors.id, id)); return getDoctorById(id); }
export async function getDoctorDeletionDependencies(doctor: { clientId: number; name: string }) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const rows = await db.select({ surgeries: count() }).from(surgeries).where(and(eq(surgeries.clientId, doctor.clientId), eq(surgeries.surgeon, doctor.name))); return { surgeries: Number(rows[0]?.surgeries ?? 0) }; }
export async function removeDoctor(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(doctors).where(eq(doctors.id, id)); return { success: true } as const; }
export async function createGeography(input: typeof geography.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(geography).values(input); return db.select().from(geography).where(eq(geography.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function getGeographyById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(geography).where(eq(geography.id, id)).limit(1); return rows[0]; }
export async function updateGeography(id: number, input: Partial<typeof geography.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(geography).set(input).where(eq(geography.id, id)); return getGeographyById(id); }
export async function removeGeography(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(geography).where(eq(geography.id, id)); return { success: true } as const; }

export async function listClients() { const db = await getDb(); if (!db) return []; return db.select().from(clients).orderBy(clients.name); }
export async function createClient(input: typeof clients.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(clients).values(input); return getClientById(Number(result[0].insertId)); }
export async function updateClient(id: number, input: Partial<typeof clients.$inferInsert>) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(clients).set(input).where(eq(clients.id, id)); return getClientById(id); }
export async function getClientDeletionDependencies(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const [doctorRows, taskRows, surgeryRows, visitPlanRows] = await Promise.all([db.select({ total: count() }).from(doctors).where(eq(doctors.clientId, id)), db.select({ total: count() }).from(tasks).where(eq(tasks.clientId, id)), db.select({ total: count() }).from(surgeries).where(eq(surgeries.clientId, id)), db.select({ total: count() }).from(visitPlans).where(eq(visitPlans.clientId, id))]); return { doctors: Number(doctorRows[0]?.total ?? 0), tasks: Number(taskRows[0]?.total ?? 0), surgeries: Number(surgeryRows[0]?.total ?? 0), visitPlans: Number(visitPlanRows[0]?.total ?? 0) }; }
export async function removeClient(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.delete(clients).where(eq(clients.id, id)); return { success: true } as const; }
export async function getClientById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1); return rows[0]; }
export async function listTasksForDelegate(delegateId: number) { return (await listAllTasks()).filter((task) => task.delegateId === delegateId); }
export async function listAllTasks() { const db = await getDb(); if (!db) return []; const [rows, clientRows, people] = await Promise.all([db.select().from(tasks).orderBy(tasks.scheduledAt), db.select().from(clients), db.select().from(users)]); const clientsById = new Map(clientRows.map((client) => [client.id, client])); const peopleById = new Map(people.map((person) => [person.id, person])); return rows.map((task) => { const client = clientsById.get(task.clientId); const delegate = peopleById.get(task.delegateId); return { ...task, clientName: client?.name ?? "Unassigned client", clientLatitude: client?.latitude ?? null, clientLongitude: client?.longitude ?? null, clientCity: client?.city ?? null, delegateName: delegate?.name || delegate?.email || "Unassigned Delegate", delegateEmail: delegate?.email || null }; }); }
export async function listTasksForManager(managerId: number) { const allowed = await listDelegateIdsForManager(managerId); if (!allowed.length) return []; const all = await listAllTasks(); return all.filter((task) => allowed.includes(task.delegateId)); }
export async function createTask(input: typeof tasks.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(tasks).values(input); return getTaskById(Number(result[0].insertId)); }
export async function getTaskById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1); return rows[0]; }
export async function updateTaskStatus(id: number, status: "pending" | "in_progress" | "completed" | "cancelled") { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(tasks).set({ status }).where(eq(tasks.id, id)); return getTaskById(id); }
export async function getVisitByTaskId(taskId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(visits).where(eq(visits.taskId, taskId)).limit(1); return rows[0]; }
export async function getVisitById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(visits).where(eq(visits.id, id)).limit(1); return rows[0]; }
export async function upsertVisit(input: typeof visits.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const existing = await getVisitByTaskId(input.taskId); if (existing) { await db.update(visits).set(input).where(eq(visits.id, existing.id)); return getVisitByTaskId(input.taskId); } await db.insert(visits).values(input); return getVisitByTaskId(input.taskId); }
export async function addEvidence(input: typeof evidence.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(evidence).values(input); return result[0].insertId; }
export async function addAuditEvent(input: typeof auditEvents.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(auditEvents).values(input); if (input.entityType === "surgery" && input.entityId) { const labels: Record<string, { title: string; body: string; includeWarehouseHeroes?: boolean }> = { "surgery.created": { title: "New surgery registered", body: "A new surgery record has been added to the shared calendar." }, "manager_surgery.created": { title: "New surgery registered", body: "A Manager added a surgery record to the shared calendar." }, "surgery.calendar_updated": { title: "Surgery schedule updated", body: "The surgery date or appointment details have changed." }, "surgery.readiness_updated": { title: "Surgery readiness updated", body: "The preoperative readiness checklist has changed.", includeWarehouseHeroes: true }, "surgery.postponed": { title: "Surgery postponed", body: "The surgery has been postponed and requires schedule review." }, "surgery.cancelled": { title: "Surgery cancelled", body: "The surgery has been cancelled." }, "surgery.completed": { title: "Surgery completed", body: "The surgery was marked completed." }, "surgery.updated": { title: "Surgery record updated", body: "Clinical surgery details have been updated." }, "surgery.implant_registered": { title: "Implant registered", body: "An implant was added to the surgery record." }, "surgery.delivery_proof_uploaded": { title: "Patient-sheet proof uploaded", body: "A patient-sheet delivery proof is available for review.", includeWarehouseHeroes: true } }; const alert = labels[input.action]; if (alert) await createSurgeryNotifications({ surgeryId: input.entityId, actorId: input.actorId, kind: input.action, title: alert.title, body: alert.body, includeWarehouseHeroes: alert.includeWarehouseHeroes }); } }

export async function listAuditEvents(limit = 100) { const db = await getDb(); if (!db) return []; return db.select().from(auditEvents).limit(limit); }
export async function listUserNotifications(userId: number, limit = 50) { const db = await getDb(); if (!db) return []; const [rows, people] = await Promise.all([db.select().from(userNotifications).where(eq(userNotifications.userId, userId)).orderBy(desc(userNotifications.createdAt)).limit(limit), db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users)]); const peopleById = new Map(people.map((person) => [person.id, person])); return rows.map((row) => { const actor = row.actorId ? peopleById.get(row.actorId) : undefined; return { ...row, actorName: actor?.name || actor?.email || null, actorEmail: actor?.email || null, actorRole: actor?.role || null }; }); }
export async function createUserNotifications(input: Array<typeof userNotifications.$inferInsert>) { const db = await getDb(); if (!db || !input.length) return []; await db.insert(userNotifications).values(input); return input; }
export async function markAllNotificationsRead(userId: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.update(userNotifications).set({ readAt: new Date() }).where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt))); return { updated: Number(result[0]?.affectedRows ?? 0) }; }
export async function markNotificationRead(userId: number, notificationId: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.update(userNotifications).set({ readAt: new Date() }).where(and(eq(userNotifications.userId, userId), eq(userNotifications.id, notificationId), isNull(userNotifications.readAt))); return { updated: Number(result[0]?.affectedRows ?? 0) }; }
export async function getSurgeryNotificationRecipientIds(surgeryId: number, includeWarehouseHeroes = false) { const db = await getDb(); if (!db) return []; const [surgery, people, assignments] = await Promise.all([getSurgeryById(surgeryId), db.select({ id: users.id, role: users.role }).from(users), db.select().from(managerDelegateAssignments)]); if (!surgery) return []; const recipientIds = new Set<number>(); for (const person of people) { if (person.role === "admin" || person.id === surgery.delegateId || assignments.some((assignment) => assignment.delegateId === surgery.delegateId && assignment.managerId === person.id) || (includeWarehouseHeroes && person.role === "warehouse_hero")) recipientIds.add(person.id); } return Array.from(recipientIds); }
export async function createSurgeryNotifications(input: { surgeryId: number; actorId: number; kind: string; title: string; body: string; includeWarehouseHeroes?: boolean }) { const recipientIds = (await getSurgeryNotificationRecipientIds(input.surgeryId, input.includeWarehouseHeroes)).filter((id) => id !== input.actorId); return createUserNotifications(recipientIds.map((userId) => ({ userId, actorId: input.actorId, kind: input.kind, title: input.title, body: input.body, entityType: "surgery", entityId: input.surgeryId }))); }
export async function listSurgeryTimeline(surgeryId: number) { const db = await getDb(); if (!db) return []; const [rows, people] = await Promise.all([db.select().from(auditEvents).where(and(eq(auditEvents.entityType, "surgery"), eq(auditEvents.entityId, surgeryId))).orderBy(desc(auditEvents.createdAt)), db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users)]); const peopleById = new Map(people.map((person) => [person.id, person])); return rows.map((row) => { const actor = peopleById.get(row.actorId); let metadata: Record<string, unknown> | null = null; try { metadata = row.metadata ? JSON.parse(row.metadata) : null; } catch { metadata = null; } return { ...row, actorName: actor?.name || actor?.email || "Unknown FFM member", actorEmail: actor?.email || null, actorRole: actor?.role || null, metadata }; }); }
export async function getWeeklyBackupReminderSchedule() { const db = await getDb(); if (!db) return undefined; return db.select().from(weeklyBackupReminderSchedules).limit(1).then((rows) => rows[0]); }
export async function getWeeklyBackupReminderScheduleByTaskUid(taskUid: string) { const db = await getDb(); if (!db) return undefined; return db.select().from(weeklyBackupReminderSchedules).where(eq(weeklyBackupReminderSchedules.scheduleCronTaskUid, taskUid)).limit(1).then((rows) => rows[0]); }
export async function recordWeeklyBackupReminder(taskUid: string, triggeredAt: Date) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(weeklyBackupReminderSchedules).set({ lastTriggeredAt: triggeredAt }).where(eq(weeklyBackupReminderSchedules.scheduleCronTaskUid, taskUid)); return getWeeklyBackupReminderScheduleByTaskUid(taskUid); }
export async function captureClientError(input: typeof clientErrorReports.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(clientErrorReports).values(input); }
export async function listClientErrors(limit = 100, includeResolved = false) { const db = await getDb(); if (!db) return []; const query = db.select().from(clientErrorReports).orderBy(desc(clientErrorReports.createdAt)); return includeResolved ? query.limit(limit) : query.where(isNull(clientErrorReports.resolvedAt)).limit(limit); }
export async function dismissClientError(id: number) { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(clientErrorReports).set({ resolvedAt: new Date() }).where(eq(clientErrorReports.id, id)); return { success: true } as const; }
export async function dismissAllClientErrors() { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.update(clientErrorReports).set({ resolvedAt: new Date() }).where(isNull(clientErrorReports.resolvedAt)); return Number(result[0]?.affectedRows ?? 0); }
export async function getMonitoringHealth() { const db = await getDb(); if (!db) return { database: "unavailable" as const, auditEvents: 0, clientErrors: 0 }; const [audit, errors] = await Promise.all([db.select({ total: count() }).from(auditEvents), db.select({ total: count() }).from(clientErrorReports).where(isNull(clientErrorReports.resolvedAt))]); return { database: "online" as const, auditEvents: Number(audit[0]?.total ?? 0), clientErrors: Number(errors[0]?.total ?? 0) }; }
export function filterTasksByDateRange<T extends { scheduledAt: Date }>(rows: T[], filters?: { from?: string; to?: string }) { const from = filters?.from ? new Date(filters.from) : undefined; const to = filters?.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined; return rows.filter((task) => (!from || task.scheduledAt >= from) && (!to || task.scheduledAt <= to)); }
export async function getOperationalSummary(filters?: { from?: string; to?: string; delegateIds?: number[] }) { const db = await getDb(); if (!db) return { clients: 0, tasks: 0, completedTasks: 0, pendingTasks: 0 }; const [clientRows, taskRows] = await Promise.all([db.select().from(clients), db.select().from(tasks)]); const assignedTasks = filters?.delegateIds ? taskRows.filter((task) => filters.delegateIds?.includes(task.delegateId)) : taskRows; const filteredTasks = filterTasksByDateRange(assignedTasks, filters); return { clients: clientRows.length, tasks: filteredTasks.length, completedTasks: filteredTasks.filter((task) => task.status === "completed").length, pendingTasks: filteredTasks.filter((task) => task.status === "pending").length }; }
export async function getDetailedSurgeryReport(filters?: { from?: string; to?: string; delegateIds?: number[] }) {
  const db = await getDb();
  if (!db) return [];
  const [surgeryRows, clientRows, people, assignments, implantRows, catalogue] = await Promise.all([
    db.select().from(surgeries).orderBy(surgeries.surgeryDate),
    db.select().from(clients),
    db.select().from(users),
    db.select().from(managerDelegateAssignments),
    db.select().from(surgeryImplants).orderBy(surgeryImplants.registeredAt),
    db.select().from(implantCatalogue),
  ]);
  const from = filters?.from ? new Date(filters.from) : undefined;
  const to = filters?.to ? new Date(`${filters.to}T23:59:59.999Z`) : undefined;
  const clientsById = new Map(clientRows.map((client) => [client.id, client]));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const catalogueById = new Map(catalogue.map((item) => [item.id, item]));
  const managerByDelegateId = new Map(assignments.map((assignment) => [assignment.delegateId, peopleById.get(assignment.managerId)]));
  const implantsBySurgeryId = new Map<number, typeof implantRows>();
  for (const implant of implantRows) implantsBySurgeryId.set(implant.surgeryId, [...(implantsBySurgeryId.get(implant.surgeryId) ?? []), implant]);
  return surgeryRows
    .filter((surgery) => (!filters?.delegateIds || filters.delegateIds.includes(surgery.delegateId)) && (!from || surgery.surgeryDate >= from) && (!to || surgery.surgeryDate <= to))
    .map((surgery) => {
      const client = clientsById.get(surgery.clientId);
      const delegate = peopleById.get(surgery.delegateId);
      const manager = managerByDelegateId.get(surgery.delegateId);
      const implants = (implantsBySurgeryId.get(surgery.id) ?? []).map((implant) => {
        const catalogueItem = implant.implantCatalogueId ? catalogueById.get(implant.implantCatalogueId) : undefined;
        const quantity = Number(implant.quantity);
        const unitPrice = Number(implant.unitPrice ?? 0);
        const lineTotal = Number.isFinite(unitPrice) ? Number((quantity * unitPrice).toFixed(2)) : 0;
        const currency = (implant.currency || "SAR").toUpperCase();
        return { id: implant.id, implantName: implant.implantName || catalogueItem?.name || "Unspecified implant", productCode: catalogueItem?.productCode || null, manufacturer: catalogueItem?.manufacturer || null, quantity, unitPrice, currency, lineTotal, notes: implant.notes || null };
      });
      const implantTotals = calculateSurgeryImplantTotals(implants);
      return {
        surgeryId: surgery.id,
        surgeryDate: surgery.surgeryDate,
        status: surgery.calendarStatus,
        procedureName: surgery.procedureName || "Surgery",
        hospital: surgery.hospital || client?.name || "Hospital not recorded",
        hospitalCity: client?.city || null,
        hospitalContact: client?.contactPerson || null,
        doctor: surgery.surgeon || "Doctor not recorded",
        delegateName: delegate?.name || delegate?.email || "Unassigned Delegate",
        delegateEmail: delegate?.email || null,
        managerName: manager?.name || manager?.email || "Manager not assigned",
        managerEmail: manager?.email || null,
        implants,
        implantTotals,
        totalImplantPrice: implantTotals.map((total) => `${total.currency} ${total.total.toFixed(2)}`).join(" · ") || "No implant pricing recorded",
      };
    });
}
