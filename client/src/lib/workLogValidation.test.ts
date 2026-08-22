import { describe, expect, it } from "vitest";
import { canSubmitWorkLog, mondayForDate } from "./workLogValidation";

describe("Delegate work-log validation", () => {
  it("normalizes a selected date to the Monday of its week", () => {
    expect(mondayForDate("2026-08-20")).toBe("2026-08-17");
    expect(mondayForDate("2026-08-17")).toBe("2026-08-17");
  });

  it("requires meaningful daily report summary and outcome fields", () => {
    expect(canSubmitWorkLog("short", "A sufficient outcome")).toBe(false);
    expect(canSubmitWorkLog("A sufficient summary", "A sufficient outcome")).toBe(true);
  });
});
