import { describe, expect, it } from "vitest";
import { MAX_HOSPITALS_PER_DAY, MIN_HOSPITALS_PER_DAY, hasAtLeastHospitals, planIsComplete, sixDayHospitalPlan, scheduleIsComplete, sixDaySchedule } from "./workLogSchedule";

describe("six-day Delegate visit schedule", () => {
  it("creates six consecutive working-plan rows from the selected Monday", () => {
    const schedule = sixDaySchedule("2026-08-17");
    expect(schedule).toHaveLength(6);
    expect(schedule[0].date).toBe("2026-08-17");
    expect(schedule[5].date).toBe("2026-08-22");
  });

  it("requires a date, hospital, and doctor for every scheduled day", () => {
    const schedule = sixDaySchedule("2026-08-17");
    expect(scheduleIsComplete(schedule)).toBe(false);
    for (const day of schedule) { day.clientId = "1"; day.doctorId = "2"; }
    expect(scheduleIsComplete(schedule)).toBe(true);
  });

  it("requires at least three hospitals when the field plan needs broader coverage", () => {
    const schedule = sixDaySchedule("2026-08-17");
    for (const day of schedule) { day.clientId = "1"; day.doctorId = "2"; }
    expect(hasAtLeastHospitals(schedule)).toBe(false);
    schedule[2].clientId = "3"; schedule[3].clientId = "3"; schedule[4].clientId = "4"; schedule[5].clientId = "4";
    expect(hasAtLeastHospitals(schedule)).toBe(true);
  });

  it("starts each of six plan days with three hospital rows and permits no more than six", () => {
    const plan = sixDayHospitalPlan("2026-08-17");
    expect(plan).toHaveLength(6);
    expect(plan.every((day) => day.visits.length === MIN_HOSPITALS_PER_DAY)).toBe(true);
    expect(plan[0].visits).toHaveLength(MIN_HOSPITALS_PER_DAY);
    for (const day of plan) {
      for (let index = 0; index < day.visits.length; index += 1) { const visit = day.visits[index]!; visit.clientId = String(index + 1); visit.doctorId = String(index + 20); }
    }
    expect(planIsComplete(plan)).toBe(true);
    plan[0].visits.push({ date: plan[0].date, clientId: "4", doctorId: "24" }, { date: plan[0].date, clientId: "5", doctorId: "25" }, { date: plan[0].date, clientId: "6", doctorId: "26" }, { date: plan[0].date, clientId: "7", doctorId: "27" });
    expect(plan[0].visits).toHaveLength(MAX_HOSPITALS_PER_DAY + 1);
    expect(planIsComplete(plan)).toBe(false);
  });
});
