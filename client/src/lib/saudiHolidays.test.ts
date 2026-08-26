import { describe, expect, it } from "vitest";
import { saudiHolidaysForRange } from "./saudiHolidays";

describe("Saudi planning holidays", () => {
  it("includes fixed Saudi Founding Day and National Day", () => {
    expect(saudiHolidaysForRange("2026-02-21", "2026-02-27")).toContainEqual(expect.objectContaining({ date: "2026-02-22", name: "Saudi Founding Day", source: "fixed" }));
    expect(saudiHolidaysForRange("2026-09-19", "2026-09-25")).toContainEqual(expect.objectContaining({ date: "2026-09-23", name: "Saudi National Day", source: "fixed" }));
  });

  it("includes annual official Eid schedule dates only within the selected range", () => {
    const holidays = saudiHolidaysForRange("2026-05-23", "2026-05-29");
    expect(holidays).toHaveLength(5);
    expect(holidays[0]).toMatchObject({ date: "2026-05-24", name: "Eid al-Adha", source: "annual_schedule" });
    expect(holidays.at(-1)).toMatchObject({ date: "2026-05-28", name: "Eid al-Adha" });
  });
});
