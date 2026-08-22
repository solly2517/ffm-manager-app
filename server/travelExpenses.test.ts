import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { afterEach, describe, expect, it, vi } from "vitest";

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const now = new Date("2026-08-22T12:00:00.000Z");
const member = {
  id: 4,
  openId: "member-4",
  email: "member@example.com",
  name: "Member",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};
const manager = { ...member, id: 11, email: "manager@example.com", role: "manager" as const };
const operationalManager = { ...member, id: 12, email: "amreslam@altamammed.com", role: "manager" as const };
const administrator = { ...member, id: 1, email: "dr.seleam@gmail.com", role: "admin" as const };
const delegate = { ...member, id: 5, email: "delegate@example.com", role: "delegate" as const };
const warehouseHero = { ...member, id: 6, email: "hero@example.com", role: "warehouse_hero" as const };

const submission = {
  managerApproverId: 11,
  claimDate: "2026-08-21",
  department: "Clinical",
  jobNature: "Hospital visit",
  transportMode: "car" as const,
  ticketReference: "TR-1",
  estimatedDays: 2,
  tripSegments: [{ from: "Riyadh", to: "Jeddah", date: "2026-08-21", transportation: "car" as const, time: "08:00" }],
  jobReport: "Completed the planned hospital visit and follow-up.",
  currency: "sar",
  lines: [{ category: "hotel" as const, description: "Hotel", days: 2, amountPerDay: 225.5, remarks: "Receipt retained" }],
};

const pendingClaim = {
  id: 71,
  claimantId: delegate.id,
  managerApproverId: manager.id,
  operationalApproverId: operationalManager.id,
  status: "pending" as const,
  managerApprovedAt: null,
  operationalApprovedAt: null,
  releasedAt: null,
  totalAmount: "451.00",
  currency: "SAR",
};

describe("Travel Expenses workflow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calculates each expense line total from days and rate with two-decimal precision", () => {
    expect(db.travelExpenseLineTotal({ days: 2, amountPerDay: 225.5 })).toBe(451);
    expect(db.travelExpenseLineTotal({ days: 3, amountPerDay: 9.95 })).toBe(29.85);
  });

  it("allows a Warehouse Hero to submit a personal claim while the server controls approvers and totals", async () => {
    vi.spyOn(db, "listUsers").mockResolvedValue([warehouseHero, operationalManager, administrator] as never);
    vi.spyOn(db, "getUserById").mockResolvedValue(operationalManager as never);
    vi.spyOn(db, "createTravelExpenseClaim").mockResolvedValue({ ...pendingClaim, claimantId: warehouseHero.id, managerApproverId: operationalManager.id, operationalApproverId: operationalManager.id, totalAmount: 451 } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(caller.travelExpenses.submit(submission)).resolves.toMatchObject({ claimantId: warehouseHero.id, totalAmount: 451 });
    expect(db.createTravelExpenseClaim).toHaveBeenCalledWith(expect.objectContaining({
      claim: expect.objectContaining({ claimantId: warehouseHero.id, managerApproverId: operationalManager.id, operationalApproverId: operationalManager.id, currency: "SAR" }),
      lines: submission.lines,
    }));
  });

  it("requires a Delegate claim to use the Delegate's assigned Manager", async () => {
    vi.spyOn(db, "listUsers").mockResolvedValue([delegate, manager, operationalManager] as never);
    vi.spyOn(db, "getUserById").mockResolvedValue(manager as never);
    vi.spyOn(db, "isDelegateAssignedToManager").mockResolvedValue(false);
    const createClaim = vi.spyOn(db, "createTravelExpenseClaim");
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.travelExpenses.submit(submission)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("blocks a claimant from Manager self-approval and blocks Warehouse Heroes from approval actions", async () => {
    vi.spyOn(db, "getTravelExpenseClaimById").mockResolvedValue({ ...pendingClaim, claimantId: manager.id } as never);
    const managerCaller = appRouter.createCaller(contextFor(manager));
    const heroCaller = appRouter.createCaller(contextFor(warehouseHero));
    await expect(managerCaller.travelExpenses.approveManager({ id: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(heroCaller.travelExpenses.approveManager({ id: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(heroCaller.travelExpenses.release({ id: 71 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps a claim pending after only its Manager has approved", async () => {
    vi.spyOn(db, "getTravelExpenseClaimById").mockResolvedValue(pendingClaim as never);
    vi.spyOn(db, "updateTravelExpenseClaim").mockResolvedValue({ ...pendingClaim, managerApprovedAt: now } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.travelExpenses.approveManager({ id: 71 })).resolves.toMatchObject({ id: 71 });
    expect(db.updateTravelExpenseClaim).toHaveBeenCalledWith(71, expect.objectContaining({ status: "pending", managerApprovedAt: expect.any(Date) }));
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "travel_expense.manager_approved" }));
  });

  it("accepts a claim only when the designated Operational Manager records the second approval", async () => {
    vi.spyOn(db, "getTravelExpenseClaimById").mockResolvedValue({ ...pendingClaim, managerApprovedAt: now } as never);
    vi.spyOn(db, "updateTravelExpenseClaim").mockResolvedValue({ ...pendingClaim, managerApprovedAt: now, operationalApprovedAt: now, status: "accepted" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(operationalManager));
    await expect(caller.travelExpenses.approveOperational({ id: 71 })).resolves.toMatchObject({ status: "accepted" });
    expect(db.updateTravelExpenseClaim).toHaveBeenCalledWith(71, expect.objectContaining({ status: "accepted", operationalApprovedAt: expect.any(Date) }));
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "travel_expense.accepted" }));
  });

  it("records the server release timestamp only for an accepted claim released by the Operational Manager", async () => {
    const acceptedClaim = { ...pendingClaim, status: "accepted" as const, managerApprovedAt: now, operationalApprovedAt: now };
    vi.spyOn(db, "getTravelExpenseClaimById").mockResolvedValue(acceptedClaim as never);
    vi.spyOn(db, "updateTravelExpenseClaim").mockResolvedValue({ ...acceptedClaim, status: "released", releasedAt: now } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(operationalManager));
    await expect(caller.travelExpenses.release({ id: 71 })).resolves.toMatchObject({ status: "released" });
    expect(db.updateTravelExpenseClaim).toHaveBeenCalledWith(71, expect.objectContaining({ status: "released", releasedAt: expect.any(Date) }));
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "travel_expense.released", metadata: expect.stringContaining("releasedAt") }));
  });
});
