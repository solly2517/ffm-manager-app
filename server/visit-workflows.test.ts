import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { canUserUpdateTask, normalizeVisitReport, prepareVisitReport, visitPlanStatusLabel } from "./db";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import { storagePut } from "./storage";

vi.mock("./storage", () => ({ storagePut: vi.fn() }));

function delegateContext(): TrpcContext { return { user: { id: 7, openId: "delegate-7", name: "Delegate", email: "delegate@example.com", loginMethod: "test", role: "delegate", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }
function managerContext(): TrpcContext { return { user: { id: 9, openId: "manager-9", name: "Manager", email: "manager@example.com", loginMethod: "test", role: "manager", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }
function adminContext(): TrpcContext { return { user: { id: 1, openId: "admin-1", name: "Administrator", email: "dr.seleam@gmail.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }

describe("Delegate visit workflows", () => {
  afterEach(() => vi.restoreAllMocks());
  it("normalizes visit report text before persistence", () => {
    expect(normalizeVisitReport("  Follow-up required  ")).toBe("Follow-up required");
  });

  it("prepares a successful normalized saveVisitReport payload without fixtures", () => {
    expect(prepareVisitReport("  Follow-up required  ")).toEqual({ report: "Follow-up required" });
  });

  it("saves a normalized visit report through the router without persistent fixtures", async () => {
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 91, delegateId: 7 } as never);
    vi.spyOn(db, "upsertVisit").mockResolvedValue({ taskId: 91, report: "Follow-up required" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(delegateContext());
    await expect(caller.operations.saveVisitReport({ taskId: 91, report: "  Follow-up required  " })).resolves.toMatchObject({ report: "Follow-up required" });
  });

  it("submits a visit plan for the signed-in Delegate through the router", async () => {
    vi.spyOn(db, "createVisitPlan").mockResolvedValue({ id: 22, delegateId: 7, clientId: 41, proposedAt: new Date("2026-09-05T09:00:00.000Z"), status: "pending", notes: "Morning follow-up" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(delegateContext());
    await expect(caller.operations.submitVisitPlan({ clientId: 41, proposedAt: new Date("2026-09-05T09:00:00.000Z"), notes: "Morning follow-up" })).resolves.toMatchObject({ id: 22, delegateId: 7, status: "pending" });
    expect(db.createVisitPlan).toHaveBeenCalledWith(expect.objectContaining({ delegateId: 7, clientId: 41, notes: "Morning follow-up" }));
  });

  it("stores evidence only when the visit belongs to the signed-in Delegate", async () => {
    vi.spyOn(db, "getVisitById").mockResolvedValue({ id: 88, taskId: 91 } as never);
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 91, delegateId: 7 } as never);
    vi.mocked(storagePut).mockResolvedValue({ key: "evidence/7/photo.jpg", url: "/manus-storage/evidence/7/photo.jpg" });
    vi.spyOn(db, "addEvidence").mockResolvedValue(31 as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(delegateContext());
    await expect(caller.operations.uploadEvidence({ visitId: 88, kind: "photo", fileName: "photo.jpg", mimeType: "image/jpeg", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==" })).resolves.toEqual({ evidenceId: 31, url: "/manus-storage/evidence/7/photo.jpg" });
    expect(db.addEvidence).toHaveBeenCalledWith(expect.objectContaining({ visitId: 88, uploadedBy: 7, storageKey: "evidence/7/photo.jpg" }));
  });

  it("rejects evidence upload for another Delegate's visit before storage writes", async () => {
    vi.spyOn(db, "getVisitById").mockResolvedValue({ id: 89, taskId: 92 } as never);
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 92, delegateId: 8 } as never);
    const evidence = vi.spyOn(db, "addEvidence");
    const caller = appRouter.createCaller(delegateContext());
    await expect(caller.operations.uploadEvidence({ visitId: 89, kind: "photo", fileName: "other.jpg", mimeType: "image/jpeg", base64: "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(evidence).not.toHaveBeenCalled();
  });

  it("allows a Delegate to update the status of their own task and records the audit event", async () => {
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 93, delegateId: 7, status: "pending" } as never);
    vi.spyOn(db, "updateTaskStatus").mockResolvedValue({ id: 93, delegateId: 7, status: "completed" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(delegateContext());
    await expect(caller.operations.updateTaskStatus({ id: 93, status: "completed" })).resolves.toMatchObject({ id: 93, status: "completed" });
    expect(db.updateTaskStatus).toHaveBeenCalledWith(93, "completed");
  });

  it("rejects a Delegate task-status update for another Delegate's task", async () => {
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 94, delegateId: 8, status: "pending" } as never);
    const update = vi.spyOn(db, "updateTaskStatus");
    const caller = appRouter.createCaller(delegateContext());
    await expect(caller.operations.updateTaskStatus({ id: 94, status: "completed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(update).not.toHaveBeenCalled();
  });

  it("allows an assigned Manager to update a Delegate task status", async () => {
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 98, delegateId: 8, status: "pending" } as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([8]);
    vi.spyOn(db, "updateTaskStatus").mockResolvedValue({ id: 98, delegateId: 8, status: "completed" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    await expect(appRouter.createCaller(managerContext()).operations.updateTaskStatus({ id: 98, status: "completed" })).resolves.toMatchObject({ id: 98, status: "completed" });
  });

  it("rejects unassigned Manager task and visit mutations before writes", async () => {
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 99, delegateId: 8, status: "pending" } as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([]);
    const taskUpdate = vi.spyOn(db, "updateTaskStatus");
    const visitWrite = vi.spyOn(db, "upsertVisit");
    const caller = appRouter.createCaller(managerContext());
    await expect(caller.operations.updateTaskStatus({ id: 99, status: "completed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.operations.checkIn({ taskId: 99, latitude: "24.7136", longitude: "46.6753" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.operations.saveVisitReport({ taskId: 99, report: "Unapproved attempt" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.operations.checkOut({ taskId: 99, latitude: "24.7136", longitude: "46.6753", report: "Unapproved attempt" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(taskUpdate).not.toHaveBeenCalled();
    expect(visitWrite).not.toHaveBeenCalled();
  });

  it("returns a visit record to its owning Delegate, an assigned Manager, and an Administrator", async () => {
    const visit = { id: 44, taskId: 95, report: "Completed" } as never;
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 95, delegateId: 7 } as never);
    vi.spyOn(db, "getVisitByTaskId").mockResolvedValue(visit);
    await expect(appRouter.createCaller(delegateContext()).operations.visit({ taskId: 95 })).resolves.toEqual(visit);

    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 96, delegateId: 8 } as never);
    vi.spyOn(db, "getVisitByTaskId").mockResolvedValue({ id: 45, taskId: 96 } as never);
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([8]);
    await expect(appRouter.createCaller(managerContext()).operations.visit({ taskId: 96 })).resolves.toMatchObject({ id: 45 });
    await expect(appRouter.createCaller(adminContext()).operations.visit({ taskId: 96 })).resolves.toMatchObject({ id: 45 });
  });

  it("rejects visit records outside the signed-in Delegate or Manager assignment scope", async () => {
    vi.spyOn(db, "getTaskById").mockResolvedValue({ id: 97, delegateId: 8 } as never);
    const readVisit = vi.spyOn(db, "getVisitByTaskId");
    await expect(appRouter.createCaller(delegateContext()).operations.visit({ taskId: 97 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.spyOn(db, "listDelegateIdsForManager").mockResolvedValue([]);
    await expect(appRouter.createCaller(managerContext()).operations.visit({ taskId: 97 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(readVisit).not.toHaveBeenCalled();
  });

  it("allows delegates to update only their own tasks", () => {
    expect(canUserUpdateTask("delegate", 7, 7)).toBe(true);
    expect(canUserUpdateTask("delegate", 7, 8)).toBe(false);
    expect(canUserUpdateTask("manager", 7, 8)).toBe(true);
  });

  it("surfaces visit-plan review labels", () => {
    expect(visitPlanStatusLabel("pending")).toBe("Pending review");
    expect(visitPlanStatusLabel("approved")).toBe("Approved");
    expect(visitPlanStatusLabel("rejected")).toBe("Rejected");
  });
});
