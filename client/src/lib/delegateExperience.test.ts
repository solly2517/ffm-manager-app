import { describe, expect, it } from "vitest";
import { describeGeolocationError, getRoleLandingPath } from "./delegateExperience";

describe("Delegate experience helpers", () => {
  it("routes Delegates and Warehouse Heroes away from the Manager home", () => {
    expect(getRoleLandingPath("delegate")).toBe("/delegate");
    expect(getRoleLandingPath("warehouse_hero")).toBe("/warehouse-hero");
    expect(getRoleLandingPath("manager")).toBeNull();
  });

  it("gives actionable feedback for each browser geolocation failure", () => {
    expect(describeGeolocationError(1)).toContain("allow Location");
    expect(describeGeolocationError(2)).toContain("device Location/GPS");
    expect(describeGeolocationError(3)).toContain("took too long");
  });
});
