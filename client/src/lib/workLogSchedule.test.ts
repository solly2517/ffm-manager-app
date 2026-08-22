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
    expect(plan.every((day) => day.hospitals.length === MIN_HOSPITALS_PER_DAY)).toBe(true);
    expect(plan[0].hospitals).toHaveLength(MIN_HOSPITALS_PER_DAY);
    for (const day of plan) {
      for (let index = 0; index < day.hospitals.length; index += 1) { const hospital = day.hospitals[index]!; hospital.clientId = String(index + 1); hospital.doctorIds = [String(index + 20)]; }
    }
    expect(planIsComplete(plan)).toBe(true);
    plan[0].hospitals[0]!.doctorIds.push("99", "100");
    expect(planIsComplete(plan)).toBe(true);
    plan[0].hospitals.push({ clientId: "4", doctorIds: ["24"] }, { clientId: "5", doctorIds: ["25"] }, { clientId: "6", doctorIds: ["26"] }, { clientId: "7", doctorIds: ["27"] });
    expect(plan[0].hospitals).toHaveLength(MAX_HOSPITALS_PER_DAY + 1);
    expect(planIsComplete(plan)).toBe(false);
  });
});
