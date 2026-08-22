import { describe, expect, it } from "vitest";
import { androidLocationRecovery } from "./mobileLocation";

describe("Android location recovery guidance", () => {
  it("gives Chrome permission recovery instructions for blocked location", () => {
    expect(androidLocationRecovery(1)).toContain("Location to Allow");
  });

  it("gives device-location guidance when Android cannot find a position", () => {
    expect(androidLocationRecovery(2)).toContain("phone Location");
  });
});
