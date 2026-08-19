import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { filterTasksByDateRange, mergePendingInvitation, visitPlanStatusLabel } from "./db";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "manager" | "delegate" | "admin" = "user"): TrpcContext {
  return {
    user: { id: 999999, openId: `test-${role}`, name: "Test User", email: `${role}@example.com`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("expanded FFM permissions", () => {
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

  it("blocks delegates from manager-only task creation", async () => {
    const caller = appRouter.createCaller(createContext("delegate"));
    await expect(caller.operations.addTask({ delegateId: 1, clientId: 1, scheduledAt: new Date() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
