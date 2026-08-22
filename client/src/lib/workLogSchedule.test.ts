import { describe, expect, it } from "vitest";
import { hasAtLeastHospitals, scheduleIsComplete, sixDaySchedule } from "./workLogSchedule";

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
});
