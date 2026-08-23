import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Download, Home } from "lucide-react";
import { MobileStickyActions, WorkspaceBreadcrumbs } from "./WorkspaceNavigation";

describe("Workspace navigation controls", () => {
  it("renders actionable breadcrumbs and mobile sticky controls", () => {
    const dashboard = vi.fn();
    const exportCsv = vi.fn();
    render(<><WorkspaceBreadcrumbs items={[{ label: "Dashboard", onClick: dashboard }, { label: "Warehouse operations" }, { label: "Hero Lead Activity" }]}/><MobileStickyActions primary={{ label: "Dashboard", icon: Home, onClick: dashboard }} secondary={{ label: "Export CSV", icon: Download, onClick: exportCsv }}/></>);
    fireEvent.click(screen.getAllByRole("button", { name: "Dashboard" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(dashboard).toHaveBeenCalledTimes(1);
    expect(exportCsv).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Hero Lead Activity")).toBeTruthy();
  });
});
