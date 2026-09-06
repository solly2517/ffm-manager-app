import { describe, expect, it } from "vitest";
import {
  dashboardHrefForWorkspaceRole,
  needsEmbeddedWorkspaceDashboardReturn,
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

  it("shows a Dashboard return action in every non-Dashboard Manager sidebar workspace", () => {
    expect(needsEmbeddedWorkspaceDashboardReturn("surgeries")).toBe(true);
    expect(needsEmbeddedWorkspaceDashboardReturn("clients")).toBe(true);
    expect(needsEmbeddedWorkspaceDashboardReturn("messages")).toBe(true);
    expect(needsEmbeddedWorkspaceDashboardReturn("dashboard")).toBe(false);
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
