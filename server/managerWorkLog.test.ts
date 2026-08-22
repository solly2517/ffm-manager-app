import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

function contextFor(user: NonNullable<TrpcContext["user"]>): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const now = new Date("2026-08-22T12:00:00.000Z");
const manager = { id: 11, openId: "manager-11", email: "manager@example.com", name: "Manager", loginMethod: "manus", role: "manager" as const, createdAt: now, updatedAt: now, lastSignedIn: now };
const delegate = { ...manager, id: 12, openId: "delegate-12", email: "delegate@example.com", role: "delegate" as const };
const schedule = ["2026-08-22", "2026-08-23", "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27"].map(date => ({ date, visits: [{ date, clientId: 1, doctorId: 10 }, { date, clientId: 2, doctorId: 20 }, { date, clientId: 3, doctorId: 30 }] }));
const weeklyInput = { weekOf: new Date("2026-08-22T12:00:00.000Z"), objectives: "Manager coverage plan for the upcoming six-day workweek.", plannedVisits: "Hospital and doctor visits planned across the full Saturday-to-Thursday workweek.", schedule };
const directories = () => {
  vi.spyOn(db, "listClients").mockResolvedValue([{ id: 1, name: "Hospital One" }, { id: 2, name: "Hospital Two" }, { id: 3, name: "Hospital Three" }] as never);
  vi.spyOn(db, "listDoctors").mockResolvedValue([{ id: 10, clientId: 1, name: "Doctor One" }, { id: 20, clientId: 2, name: "Doctor Two" }, { id: 30, clientId: 3, name: "Doctor Three" }] as never);
};

describe("Manager Work Log authoring", () => {
  afterEach(() => vi.restoreAllMocks());

  it("records a Manager weekly plan under authorId without assigning it to a Delegate", async () => {
    directories();
    vi.spyOn(db, "createWeeklyVisitPlan").mockResolvedValue({ id: 81, authorId: manager.id, delegateId: null, status: "manager_recorded" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.delegatePlanning.submitWeeklyPlan(weeklyInput)).resolves.toMatchObject({ id: 81, status: "manager_recorded" });
    expect(db.createWeeklyVisitPlan).toHaveBeenCalledWith(expect.objectContaining({ authorId: manager.id, delegateId: null, status: "manager_recorded" }));
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "weekly_visit_plan.manager_recorded" }));
  });

  it("keeps a Delegate weekly plan pending and linked to the submitting Delegate", async () => {
    directories();
    vi.spyOn(db, "createWeeklyVisitPlan").mockResolvedValue({ id: 82, authorId: delegate.id, delegateId: delegate.id, status: "pending" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(delegate));
    await expect(caller.delegatePlanning.submitWeeklyPlan(weeklyInput)).resolves.toMatchObject({ id: 82, status: "pending" });
    expect(db.createWeeklyVisitPlan).toHaveBeenCalledWith(expect.objectContaining({ authorId: delegate.id, delegateId: delegate.id, status: "pending" }));
  });

  it("records a Manager daily report from that Manager's own approved plan context", async () => {
    directories();
    vi.spyOn(db, "listWeeklyVisitPlansForAuthor").mockResolvedValue([{ id: 81, authorId: manager.id, delegateId: null, status: "manager_recorded", scheduleJson: JSON.stringify(schedule) }] as never);
    vi.spyOn(db, "createDailyActivityReport").mockResolvedValue({ id: 91, authorId: manager.id, delegateId: null, status: "manager_recorded" } as never);
    vi.spyOn(db, "addAuditEvent").mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.delegatePlanning.submitDailyReport({ reportDate: new Date("2026-08-22T12:00:00.000Z"), visits: schedule[0].visits, summary: "Completed all scheduled hospital and doctor meetings.", outcomes: "Follow-up opportunities and next actions confirmed." })).resolves.toMatchObject({ id: 91, status: "manager_recorded" });
    expect(db.createDailyActivityReport).toHaveBeenCalledWith(expect.objectContaining({ authorId: manager.id, delegateId: null, status: "manager_recorded" }));
    expect(db.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "daily_activity_report.manager_recorded" }));
  });

  it("blocks a Manager from reviewing their own recorded plan or report", async () => {
    vi.spyOn(db, "getWeeklyVisitPlanById").mockResolvedValue({ id: 81, authorId: manager.id, delegateId: null } as never);
    vi.spyOn(db, "getDailyActivityReportById").mockResolvedValue({ id: 91, authorId: manager.id, delegateId: null } as never);
    const updatePlan = vi.spyOn(db, "updateWeeklyVisitPlan");
    const updateReport = vi.spyOn(db, "updateDailyActivityReport");
    const caller = appRouter.createCaller(contextFor(manager));
    await expect(caller.delegatePlanning.reviewWeeklyPlan({ id: 81, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.delegatePlanning.reviewDailyReport({ id: 91 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updatePlan).not.toHaveBeenCalled();
    expect(updateReport).not.toHaveBeenCalled();
  });
});
