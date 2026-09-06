import { describe, expect, it } from "vitest";
import { getSidebarTargetIndex } from "./sidebarNavigation";

describe("getSidebarTargetIndex", () => {
  it("moves focus through a sidebar list with ArrowUp and ArrowDown", () => {
    expect(getSidebarTargetIndex(3, 8, "ArrowDown")).toBe(4);
    expect(getSidebarTargetIndex(3, 8, "ArrowUp")).toBe(2);
  });

  it("keeps focus within the first and last sidebar links", () => {
    expect(getSidebarTargetIndex(0, 8, "ArrowUp")).toBe(0);
    expect(getSidebarTargetIndex(7, 8, "ArrowDown")).toBe(7);
  });

  it("supports Home and End shortcuts and ignores unrelated keys", () => {
    expect(getSidebarTargetIndex(4, 8, "Home")).toBe(0);
    expect(getSidebarTargetIndex(4, 8, "End")).toBe(7);
    expect(getSidebarTargetIndex(4, 8, "Enter")).toBeNull();
  });
});
