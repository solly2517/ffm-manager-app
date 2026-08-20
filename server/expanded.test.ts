import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { canManagerAccessDelegate, filterTasksByDateRange, mergePendingInvitation, operationalSummaryCsv, visitPlanStatusLabel } from "./db";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { getDoctorEditState } from "../client/src/lib/doctorForm";

function createContext(role: "user" | "manager" | "delegate" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 999999, openId: `test-${role}`, name: "Test User", email: `${role}@example.com`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("expanded FFM permissions", () => {
  afterEach(() => vi.restoreAllMocks());
  it("blocks non-admin invitation creation", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.admin.createInvitation({ email: "new@example.com", role: "delegate" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid invitation tokens", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.invitations.preview({ token: "x".repeat(64) })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates an existing pending invitation to Delegate with a fresh token", () => {
    const now = new Date(Date.now() + 60_000);
    const merged = mergePendingInvitation({ id: 9, acceptedAt: null, expiresAt: now, role: "manager", tokenHash: "old-token", invitedBy: 1 }, { role: "delegate", tokenHash: "new-token", invitedBy: 2, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) });
    expect(merged?.role).toBe("delegate");
    expect(merged?.tokenHash).toBe("new-token");
    expect(merged?.invitedBy).toBe(2);
  });

  it("applies date filters to task records and exports filtered summaries", async () => {
    const syntheticTasks = [{ scheduledAt: new Date("2026-08-01T09:00:00Z"), status: "completed" }, { scheduledAt: new Date("2026-08-20T09:00:00Z"), status: "pending" }];
    expect(filterTasksByDateRange(syntheticTasks, { from: "2026-08-01", to: "2026-08-01" })).toHaveLength(1);
    expect(filterTasksByDateRange(syntheticTasks, { from: "2026-08-20", to: "2026-08-20" })[0]?.status).toBe("pending");

    const caller = appRouter.createCaller(createContext("manager"));
    const summary = await caller.reports.summary({ from: "2026-01-01", to: "2026-12-31" });
    const csv = await caller.reports.exportCsv({ from: "2026-01-01", to: "2026-12-31" });
    expect(summary).toHaveProperty("tasks");
    expect(csv).toContain("metric,value");
  });

  it("compares reports.exportCsv output across different filtered summaries", async () => {
    vi.spyOn(db, "getOperationalSummary")
      .mockResolvedValueOnce({ clients: 2, tasks: 3, completedTasks: 1, pendingTasks: 2 })
      .mockResolvedValueOnce({ clients: 4, tasks: 7, completedTasks: 5, pendingTasks: 2 });
    const caller = appRouter.createCaller(createContext("manager"));
    const early = await caller.reports.exportCsv({ from: "2026-08-01", to: "2026-08-01" });
    const late = await caller.reports.exportCsv({ from: "2026-08-20", to: "2026-08-20" });
    expect(early).not.toBe(late);
    expect(early).toContain("tasks,3");
    expect(late).toContain("tasks,7");
  });

  it("changes CSV metric values when filtered report summaries change", () => {
    const early = operationalSummaryCsv({ clients: 2, tasks: 3, completedTasks: 1, pendingTasks: 2 });
    const late = operationalSummaryCsv({ clients: 4, tasks: 7, completedTasks: 5, pendingTasks: 2 });
    expect(early).not.toBe(late);
    expect(early).toContain("tasks,3");
    expect(late).toContain("tasks,7");
  });

  it("supports filtered operational summaries and CSV export", async () => {
    const caller = appRouter.createCaller(createContext("manager"));
    const summary = await caller.reports.summary({ from: "2026-01-01", to: "2026-12-31" });
    const csv = await caller.reports.exportCsv({ from: "2026-01-01", to: "2026-12-31" });
    expect(summary).toHaveProperty("tasks");
    expect(csv).toContain("metric,value");
  });

  it("protects visit-report saves for unknown or unauthorized tasks", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.operations.saveVisitReport({ taskId: 999999, report: "Follow-up" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns live visit-plan records through the protected router contract", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    const plans = await caller.operations.visitPlans();
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.every((plan) => ["pending", "approved", "rejected"].includes(plan.status))).toBe(true);
  });

  it("returns human-readable visit-plan status labels for the Delegate contract", () => {
    expect(visitPlanStatusLabel("pending")).toBe("Pending review");
    expect(visitPlanStatusLabel("approved")).toBe("Approved");
    expect(visitPlanStatusLabel("rejected")).toBe("Rejected");
  });

  it("returns no delegates for an unassigned manager through the router", async () => {
    vi.spyOn(db, "listDelegatesForManager").mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext("manager"));
    await expect(caller.operations.delegates()).resolves.toEqual([]);
  });

  it("allows managers to access only assigned delegates", () => {
    expect(canManagerAccessDelegate("manager", 10, 20, [20, 21])).toBe(true);
    expect(canManagerAccessDelegate("manager", 10, 22, [20, 21])).toBe(false);
    expect(canManagerAccessDelegate("admin", 10, 22, [])).toBe(true);
  });

  it("blocks delegates from manager-only task creation", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.operations.addTask({ delegateId: 1, clientId: 1, scheduledAt: new Date() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks delegates from doctor and geography creation", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.operations.addDoctor({ clientId: 1, name: "Dr. Example" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.operations.addGeography({ kind: "province", name: "Example Province" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("returns persisted notification preferences and updates only the requested setting", async () => {
    vi.spyOn(db, "getUserById").mockResolvedValue({ pushNotifications: false, emailNotifications: true, locationSharing: false } as any);
    const update = vi.spyOn(db, "updateNotificationPreferences").mockResolvedValue({ pushNotifications: true, emailNotifications: true, locationSharing: false } as any);
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.preferences.get()).resolves.toEqual({ pushNotifications: false, emailNotifications: true, locationSharing: false });
    await expect(caller.preferences.update({ pushNotifications: true })).resolves.toEqual({ pushNotifications: true, emailNotifications: true, locationSharing: false });
    expect(update).toHaveBeenCalledWith(999999, { pushNotifications: true });
  });
  it("rejects an empty notification preference update", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.preferences.update({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});


describe("FFM monitoring diagnostics", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows authenticated users to capture client diagnostics and blocks anonymous role access", async () => {
    const capture = vi.spyOn(db, "captureClientError").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.monitoring.captureClientError({ message: "API failed", route: "/delegate" })).resolves.toEqual({ success: true });
    expect(capture).toHaveBeenCalledWith(expect.objectContaining({ userId: 999999, message: "API failed", route: "/delegate" }));
    const userCaller = appRouter.createCaller(createContext("user"));
    await expect(userCaller.monitoring.recentClientErrors({ limit: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exposes the monitoring health contract only to administrators", async () => {
    vi.spyOn(db, "getMonitoringHealth").mockResolvedValue({ database: "online", auditEvents: 12, clientErrors: 2 });
    const adminCaller = appRouter.createCaller(createContext("admin"));
    await expect(adminCaller.monitoring.health()).resolves.toEqual({ database: "online", auditEvents: 12, clientErrors: 2 });
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.monitoring.health()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});


describe("FFM Manager client CRUD", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows managers to update and remove an existing client through protected procedures", async () => {
    vi.spyOn(db, "getClientById").mockResolvedValue({ id: 42, name: "Old Hospital" } as any);
    const update = vi.spyOn(db, "updateClient").mockResolvedValue({ id: 42, name: "New Hospital" } as any);
    const remove = vi.spyOn(db, "removeClient").mockResolvedValue({ success: true });
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("manager"));
    await expect(caller.operations.updateClient({ id: 42, name: "New Hospital" })).resolves.toEqual({ id: 42, name: "New Hospital" });
    await expect(caller.operations.removeClient({ id: 42 })).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith(42, { name: "New Hospital" });
    expect(remove).toHaveBeenCalledWith(42);
  });

  it("blocks delegate client mutations and rejects missing clients", async () => {
    const delegateCaller = appRouter.createCaller(createContext("delegate"));
    await expect(delegateCaller.operations.removeClient({ id: 42 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.spyOn(db, "getClientById").mockResolvedValue(undefined);
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.operations.updateClient({ id: 42, name: "Missing Hospital" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});


describe("FFM Manager directory CRUD", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows managers to update and remove doctors and geography records", async () => {
    vi.spyOn(db, "getDoctorById").mockResolvedValue({ id: 12, name: "Old Doctor", relationship: "warm" } as any);
    vi.spyOn(db, "getGeographyById").mockResolvedValue({ id: 13, kind: "province", name: "Old Region" } as any);
    const updateDoctor = vi.spyOn(db, "updateDoctor").mockResolvedValue({ id: 12, name: "New Doctor" } as any);
    const removeDoctor = vi.spyOn(db, "removeDoctor").mockResolvedValue({ success: true });
    const updateGeography = vi.spyOn(db, "updateGeography").mockResolvedValue({ id: 13, kind: "province", name: "New Region" } as any);
    const removeGeography = vi.spyOn(db, "removeGeography").mockResolvedValue({ success: true });
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("manager"));
    await expect(caller.operations.updateDoctor({ id: 12, clientId: 2, name: "New Doctor", relationship: "warm" })).resolves.toEqual({ id: 12, name: "New Doctor" });
    await expect(caller.operations.removeDoctor({ id: 12 })).resolves.toEqual({ success: true });
    await expect(caller.operations.updateGeography({ id: 13, kind: "province", name: "New Region" })).resolves.toEqual({ id: 13, kind: "province", name: "New Region" });
    await expect(caller.operations.removeGeography({ id: 13 })).resolves.toEqual({ success: true });
    expect(updateDoctor).toHaveBeenCalledWith(12, expect.objectContaining({ name: "New Doctor", relationship: "warm" }));
    expect(removeDoctor).toHaveBeenCalledWith(12);
    expect(updateGeography).toHaveBeenCalledWith(13, expect.objectContaining({ name: "New Region" }));
    expect(removeGeography).toHaveBeenCalledWith(13);
  });

  it("preserves a non-new doctor relationship when Manager edit form state is prepared", () => {
    expect(getDoctorEditState({ id: 12, clientId: 2, name: "Dr. Warm", specialty: "Cardiology", relationship: "warm" })).toEqual({ id: 12, clientId: "2", name: "Dr. Warm", specialty: "Cardiology", relationship: "warm" });
  });

  it("blocks delegates from doctor/geography mutations and rejects missing records", async () => {
    const delegateCaller = appRouter.createCaller(createContext("delegate"));
    await expect(delegateCaller.operations.removeDoctor({ id: 12 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(delegateCaller.operations.removeGeography({ id: 13 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.spyOn(db, "getDoctorById").mockResolvedValue(undefined);
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.operations.updateDoctor({ id: 12, clientId: 2, name: "Missing Doctor", relationship: "new" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
