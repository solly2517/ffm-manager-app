import { describe, expect, it } from "vitest";
import { shouldOfferDirectActivation } from "./inviteActivation";

describe("direct invitation activation", () => {
  it("offers direct activation when no browser session exists", () => {
    expect(shouldOfferDirectActivation(false, undefined, "e.alhasby@altamammed.com")).toBe(true);
  });

  it("offers direct activation when a different browser email is already signed in", () => {
    expect(shouldOfferDirectActivation(true, "dr.seleam@gmail.com", "e.alhasby@altamammed.com")).toBe(true);
  });

  it("keeps the standard acceptance path for the invited email", () => {
    expect(shouldOfferDirectActivation(true, "E.ALHASBY@ALTAMAMMED.COM", "e.alhasby@altamammed.com")).toBe(false);
  });
});
