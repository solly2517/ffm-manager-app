import { describe, expect, it } from "vitest";
import { canSubmitWorkLog, saturdayForDate } from "./workLogValidation";

describe("Delegate work-log validation", () => {
  it("normalizes a selected date to the Saturday that starts its workweek", () => {
    expect(saturdayForDate("2026-08-20")).toBe("2026-08-15");
    expect(saturdayForDate("2026-08-15")).toBe("2026-08-15");
    expect(saturdayForDate("2026-08-21")).toBe("2026-08-15");
  });

  it("requires meaningful daily report summary and outcome fields", () => {
    expect(canSubmitWorkLog("short", "A sufficient outcome")).toBe(false);
    expect(canSubmitWorkLog("A sufficient summary", "A sufficient outcome")).toBe(true);
  });
});
