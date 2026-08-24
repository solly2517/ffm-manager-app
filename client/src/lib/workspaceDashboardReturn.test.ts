import { describe, expect, it } from "vitest";
import {
  dashboardHrefForWorkspaceRole,
  needsWorkspaceDashboardReturn,
} from "./workspaceDashboardReturn";

describe("workspace Dashboard return navigation", () => {
  it("shows a return action for every authenticated deep workspace", () => {
    expect(needsWorkspaceDashboardReturn("/surgery-calendar")).toBe(true);
    expect(needsWorkspaceDashboardReturn("/surgery-readiness")).toBe(true);
    expect(needsWorkspaceDashboardReturn("/travel-expenses")).toBe(true);
    expect(needsWorkspaceDashboardReturn("/work-log")).toBe(true);
    expect(needsWorkspaceDashboardReturn("/")).toBe(false);
    expect(needsWorkspaceDashboardReturn("/delegate")).toBe(false);
  });

  it("returns each role to its correct dashboard", () => {
    expect(dashboardHrefForWorkspaceRole("manager")).toBe("/");
    expect(dashboardHrefForWorkspaceRole("admin")).toBe("/");
    expect(dashboardHrefForWorkspaceRole("delegate")).toBe("/delegate");
    expect(dashboardHrefForWorkspaceRole("warehouse_hero")).toBe(
      "/warehouse-hero"
    );
  });
});
