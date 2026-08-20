import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { canUserUpdateTask, normalizeVisitReport, prepareVisitReport, visitPlanStatusLabel } from "./db";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

function delegateContext(): TrpcContext { return { user: { id: 7, openId: "delegate-7", name: "Delegate", email: "delegate@example.com", loginMethod: "test", role: "delegate", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] }; }

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
