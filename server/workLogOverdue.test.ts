import { describe, expect, it } from "vitest";
import { overdueWorkLogSummary } from "../shared/workLogOverdue";

describe("overdueWorkLogSummary", () => {
  it("counts missing weekly plans and completed-day reports within the Saturday-to-Thursday workweek", () => {
    const result = overdueWorkLogSummary({
      asOf: new Date("2026-08-26T12:00:00.000Z"),
      delegates: [{ id: 1, name: "Delegated One" }, { id: 2, name: "Delegated Two" }],
      weeklyPlans: [{ authorId: 1, weekOf: "2026-08-22T12:00:00.000Z", status: "pending" }],
      dailyReports: [{ authorId: 1, reportDate: "2026-08-22T12:00:00.000Z" }, { authorId: 1, reportDate: "2026-08-23T12:00:00.000Z" }],
    });
    expect(result.weekStart).toBe("2026-08-22");
    expect(result.missingWeeklyPlans).toBe(1);
    expect(result.overdueDailyReports).toBe(6);
    expect(result.overdueDelegates.find(row => row.delegateId === 1)?.overdueDailyDates).toEqual(["2026-08-24", "2026-08-25"]);
    expect(result.overdueDelegates.find(row => row.delegateId === 2)?.missingWeeklyPlan).toBe(true);
  });
});
