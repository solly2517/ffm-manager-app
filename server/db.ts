import { and, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, invitations, clients, tasks, visits, evidence, auditEvents } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
const ADMIN_EMAIL = "dr.seleam@gmail.com";

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

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
  return getUserById(id);
}

export async function removeUser(id: number) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  await db.delete(users).where(eq(users.id, id));
}


export async function createInvitation(input: { email: string; role: "user" | "manager" | "delegate"; invitedBy: number; tokenHash: string; expiresAt: Date }) {
  const db = await getDb(); if (!db) throw new Error("Database is not available");
  const existing = await db.select().from(invitations).where(eq(invitations.email, input.email)).limit(1);
  if (existing[0] && !existing[0].acceptedAt && existing[0].expiresAt > new Date()) return existing[0];
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

export async function listClients() { const db = await getDb(); if (!db) return []; return db.select().from(clients).orderBy(clients.name); }
export async function createClient(input: typeof clients.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(clients).values(input); return getClientById(Number(result[0].insertId)); }
export async function getClientById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1); return rows[0]; }
export async function listTasksForDelegate(delegateId: number) { const db = await getDb(); if (!db) return []; return db.select().from(tasks).where(eq(tasks.delegateId, delegateId)).orderBy(tasks.scheduledAt); }
export async function listAllTasks() { const db = await getDb(); if (!db) return []; return db.select().from(tasks).orderBy(tasks.scheduledAt); }
export async function createTask(input: typeof tasks.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(tasks).values(input); return getTaskById(Number(result[0].insertId)); }
export async function getTaskById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1); return rows[0]; }
export async function updateTaskStatus(id: number, status: "pending" | "in_progress" | "completed" | "cancelled") { const db = await getDb(); if (!db) throw new Error("Database is not available"); await db.update(tasks).set({ status }).where(eq(tasks.id, id)); return getTaskById(id); }
export async function getVisitByTaskId(taskId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(visits).where(eq(visits.taskId, taskId)).limit(1); return rows[0]; }
export async function upsertVisit(input: typeof visits.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const existing = await getVisitByTaskId(input.taskId); if (existing) { await db.update(visits).set(input).where(eq(visits.id, existing.id)); return getVisitByTaskId(input.taskId); } await db.insert(visits).values(input); return getVisitByTaskId(input.taskId); }
export async function addEvidence(input: typeof evidence.$inferInsert) { const db = await getDb(); if (!db) throw new Error("Database is not available"); const result = await db.insert(evidence).values(input); return result[0].insertId; }
export async function addAuditEvent(input: typeof auditEvents.$inferInsert) { const db = await getDb(); if (!db) return; await db.insert(auditEvents).values(input); }
