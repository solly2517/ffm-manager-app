import { describe, expect, it } from "vitest";
import { selectedSurgeryIdFromSearch, surgeryCalendarPath } from "./surgeryWorkspace";

describe("Delegate surgery implant workspace navigation", () => {
  it("opens the shared surgery workspace with the selected record", () => {
    expect(surgeryCalendarPath(42)).toBe("/surgery-calendar?surgery=42");
    expect(selectedSurgeryIdFromSearch("?surgery=42")).toBe(42);
  });

  it("rejects missing, invalid, and non-positive surgery identifiers", () => {
    expect(selectedSurgeryIdFromSearch("")).toBeNull();
    expect(selectedSurgeryIdFromSearch("?surgery=0")).toBeNull();
    expect(selectedSurgeryIdFromSearch("?surgery=not-a-number")).toBeNull();
  });
});
