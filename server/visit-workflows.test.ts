import { describe, expect, it } from "vitest";
import { canUserUpdateTask, normalizeVisitReport, visitPlanStatusLabel } from "./db";

describe("Delegate visit workflows", () => {
  it("normalizes visit report text before persistence", () => {
    expect(normalizeVisitReport("  Follow-up required  ")).toBe("Follow-up required");
  });

  it("allows delegates to update only their own tasks", () => {
    expect(canUserUpdateTask("delegate", 7, 7)).toBe(true);
    expect(canUserUpdateTask("delegate", 7, 8)).toBe(false);
    expect(canUserUpdateTask("manager", 7, 8)).toBe(true);
  });

  it("surfaces visit-plan review labels", () => {
    expect(visitPlanStatusLabel("pending")).toBe("Pending review");
    expect(visitPlanStatusLabel("approved")).toBe("Approved");
    expect(visitPlanStatusLabel("rejected")).toBe("Rejected");
  });
});
