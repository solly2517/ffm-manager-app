import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { canManagerAccessDelegate, filterTasksByDateRange, mergePendingInvitation, operationalSummaryCsv, visitPlanStatusLabel } from "./db";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { getDoctorEditState } from "../client/src/lib/doctorForm";
import { decodeOAuthState, encodeOAuthState } from "@shared/const";
import { safeOAuthReturnTo } from "./_core/oauth";

function createContext(role: "user" | "manager" | "delegate" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 999999, openId: `test-${role}`, name: "Test User", email: `${role}@example.com`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("FFM OAuth invitation return state", () => {
  it("uses the invitation path and rejects external OAuth redirects", () => {
    expect(safeOAuthReturnTo("/invite/abc123")).toBe("/invite/abc123");
    expect(safeOAuthReturnTo("https://evil.example/steal")).toBe("/");
    expect(safeOAuthReturnTo("//evil.example/steal")).toBe("/");
    expect(safeOAuthReturnTo(undefined)).toBe("/");
  });

  it("preserves the same-site invitation path in OAuth state", () => {
    const encoded = encodeOAuthState({ redirectUri: "https://ffmmanager.example/api/oauth/callback", nonce: "nonce", returnTo: "/invite/abc123" });
    expect(decodeOAuthState(encoded)).toEqual({ redirectUri: "https://ffmmanager.example/api/oauth/callback", nonce: "nonce", returnTo: "/invite/abc123" });
  });
});


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

  it("blocks a Manager from directly messaging an unassigned Delegate", async () => {
    vi.spyOn(db, "getUserById").mockResolvedValue({ id: 123, openId: "delegate-123", name: "Unassigned Delegate", email: "delegate123@example.com", loginMethod: "test", role: "delegate", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([]);
    const createMessage = vi.spyOn(db, "createMessage");
    const caller = appRouter.createCaller(createContext("manager"));
    await expect(caller.operations.sendMessage({ recipientId: 123, body: "Please review the visit plan." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("requires Warehouse Heroes to enable location sharing before publishing GPS", async () => {
    const warehouseHero = { ...createContext("user").user!, id: 444, openId: "warehouse-hero-444", email: "hero@example.com", role: "warehouse_hero" as const, locationSharing: false };
    vi.spyOn(db, "getUserById").mockResolvedValue(warehouseHero);
    const caller = appRouter.createCaller({ ...createContext("user"), user: warehouseHero });
    await expect(caller.operations.updateWarehouseHeroLocation({ latitude: "24.7136000", longitude: "46.6753000" })).rejects.toMatchObject({ code: "FORBIDDEN" });
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

  it("records all four preoperative readiness checks only within the caller's surgery scope", async () => {
    const surgery = { id: 501, delegateId: 999999, surgeryDate: new Date("2026-08-27"), calendarStatus: "confirmed" };
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(surgery as never);
    const update = vi.spyOn(db, "updateSurgery").mockResolvedValue({ ...surgery, hospitalConfirmed: true, implantsAvailable: true, delegateReady: true, deliveryPrepared: true } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.operations.updateSurgeryReadiness({ id: 501, hospitalConfirmed: true, implantsAvailable: true, delegateReady: true, deliveryPrepared: true })).resolves.toMatchObject({ id: 501, deliveryPrepared: true });
    expect(update).toHaveBeenCalledWith(501, expect.objectContaining({ hospitalConfirmed: true, implantsAvailable: true, delegateReady: true, deliveryPrepared: true, readinessUpdatedBy: 999999 }));
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

  it("ignores expected invalid invitation probes instead of storing diagnostic noise", async () => {
    const capture = vi.spyOn(db, "captureClientError").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.monitoring.captureClientError({ message: "Invitation is invalid or expired", route: "/invite/not-a-real-token" })).resolves.toEqual({ success: true, ignored: true });
    expect(capture).not.toHaveBeenCalled();
  });

  it("allows only an Administrator to dismiss individual or all active client diagnostics", async () => {
    const dismissOne = vi.spyOn(db, "dismissClientError").mockResolvedValue({ success: true });
    const dismissAll = vi.spyOn(db, "dismissAllClientErrors").mockResolvedValue(4);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const adminCaller = appRouter.createCaller(createContext("admin"));
    await expect(adminCaller.monitoring.dismissClientError({ id: 33 })).resolves.toEqual({ success: true });
    await expect(adminCaller.monitoring.dismissAllClientErrors()).resolves.toEqual({ success: true, dismissedCount: 4 });
    expect(dismissOne).toHaveBeenCalledWith(33);
    expect(dismissAll).toHaveBeenCalledOnce();
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.monitoring.dismissAllClientErrors()).rejects.toMatchObject({ code: "FORBIDDEN" });
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


describe("FFM live delegate position visibility", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns only the privacy-approved live position contract to Managers", async () => {
    const positions = [{ delegateId: 20, delegateName: "Field Delegate", delegateEmail: "delegate@example.com", latitude: "24.7136000", longitude: "46.6753000", capturedAt: new Date("2026-08-20T08:00:00Z") }];
    const live = vi.spyOn(db, "listLiveDelegatePositionsForManager").mockResolvedValue(positions as any);
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.operations.liveDelegatePositions()).resolves.toEqual(positions);
    expect(live).toHaveBeenCalledWith(999999);
    const delegateCaller = appRouter.createCaller(createContext("delegate"));
    await expect(delegateCaller.operations.liveDelegatePositions()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});


describe("FFM Manager surgery and visit-plan workspaces", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows review only for visit plans belonging to assigned delegates", async () => {
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([20]);
    vi.spyOn(db, "getVisitPlanById").mockResolvedValue({ id: 7, delegateId: 20, status: "pending" } as any);
    vi.spyOn(db, "updateVisitPlan").mockResolvedValue({ id: 7, delegateId: 20, status: "approved" } as any);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("manager"));
    await expect(caller.operations.reviewVisitPlan({ id: 7, status: "approved" })).resolves.toEqual({ id: 7, delegateId: 20, status: "approved" });

    vi.spyOn(db, "getVisitPlanById").mockResolvedValue({ id: 8, delegateId: 21, status: "pending" } as any);
    await expect(caller.operations.reviewVisitPlan({ id: 8, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects review of a missing visit plan", async () => {
    vi.spyOn(db, "getVisitPlanById").mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext("manager"));
    await expect(caller.operations.reviewVisitPlan({ id: 999, status: "approved" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});


describe("FFM surgery update authorization", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows an assigned Manager and blocks an unassigned Manager", async () => {
    vi.spyOn(db, "getSurgeryById").mockResolvedValue({ id: 5, delegateId: 20, status: "pending" } as any);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([20]);
    vi.spyOn(db, "updateSurgery").mockResolvedValue({ id: 5, delegateId: 20, status: "partial" } as any);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined);
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.operations.updateSurgery({ id: 5, status: "partial", notes: "Updated" })).resolves.toEqual({ id: 5, delegateId: 20, status: "partial" });
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([]);
    await expect(managerCaller.operations.updateSurgery({ id: 5, status: "collected" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a missing surgery record", async () => {
    vi.spyOn(db, "getSurgeryById").mockResolvedValue(undefined);
    const managerCaller = appRouter.createCaller(createContext("manager"));
    await expect(managerCaller.operations.updateSurgery({ id: 999, status: "partial" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
