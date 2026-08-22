import { describe, expect, it } from "vitest";
import { dailyReportValidationError, expectedPlanDates, weeklyPlanValidationError, type WorkLogPlanDay } from "../shared/workLogRules";

const weekOf = new Date("2026-08-17T12:00:00");

function validPlan(): WorkLogPlanDay[] {
  return expectedPlanDates(weekOf).map((date) => ({
    date,
    visits: [
      { date, clientId: 1, doctorId: 11 },
      { date, clientId: 2, doctorId: 21 },
      { date, clientId: 3, doctorId: 31 },
    ],
  }));
}

describe("Delegate Work Log rules", () => {
  it("requires every weekly plan day to have three to six distinct hospitals", () => {
    const plan = validPlan();
    expect(weeklyPlanValidationError(plan, weekOf)).toBeNull();

    plan[0]!.visits.push({ date: plan[0]!.date, clientId: 1, doctorId: 12 });
    expect(weeklyPlanValidationError(plan, weekOf)).toBeNull();

    plan[0]!.visits = plan[0]!.visits.filter((visit) => visit.clientId !== 3);
    expect(weeklyPlanValidationError(plan, weekOf)).toContain("3 to 6 hospitals");

    const maximumPlan = validPlan();
    maximumPlan[0]!.visits.push(
      { date: maximumPlan[0]!.date, clientId: 4, doctorId: 41 },
      { date: maximumPlan[0]!.date, clientId: 5, doctorId: 51 },
      { date: maximumPlan[0]!.date, clientId: 6, doctorId: 61 },
    );
    expect(weeklyPlanValidationError(maximumPlan, weekOf)).toBeNull();
    maximumPlan[0]!.visits.push({ date: maximumPlan[0]!.date, clientId: 7, doctorId: 71 });
    expect(weeklyPlanValidationError(maximumPlan, weekOf)).toContain("3 to 6 hospitals");
  });

  it("allows many registered doctor visits at planned hospitals while requiring at least three", () => {
    const reportDate = new Date("2026-08-19T12:00:00");
    const visits = [
      { date: "2026-08-19", clientId: 1, doctorId: 11 },
      { date: "2026-08-19", clientId: 1, doctorId: 12 },
      { date: "2026-08-19", clientId: 2, doctorId: 21 },
      { date: "2026-08-19", clientId: 3, doctorId: 31 },
    ];
    expect(dailyReportValidationError(visits, reportDate, [1, 2, 3])).toBeNull();
  });

  it("rejects daily reports with an unplanned hospital or a duplicate doctor visit", () => {
    const reportDate = new Date("2026-08-19T12:00:00");
    const unplanned = [
      { date: "2026-08-19", clientId: 1, doctorId: 11 },
      { date: "2026-08-19", clientId: 2, doctorId: 21 },
      { date: "2026-08-19", clientId: 9, doctorId: 91 },
    ];
    expect(dailyReportValidationError(unplanned, reportDate, [1, 2, 3])).toContain("only hospitals planned");

    const duplicateDoctor = [
      { date: "2026-08-19", clientId: 1, doctorId: 11 },
      { date: "2026-08-19", clientId: 1, doctorId: 11 },
      { date: "2026-08-19", clientId: 2, doctorId: 21 },
    ];
    expect(dailyReportValidationError(duplicateDoctor, reportDate, [1, 2])).toContain("only once");
  });
});
