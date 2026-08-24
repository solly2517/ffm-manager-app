const deepWorkspacePaths = new Set([
  "/help",
  "/surgery-calendar",
  "/admin-diagnostics",
  "/surgery-readiness",
  "/work-log",
  "/travel-expenses",
]);

export function needsWorkspaceDashboardReturn(pathname: string) {
  return deepWorkspacePaths.has(pathname);
}

export function needsEmbeddedWorkspaceDashboardReturn(activeWorkspace: string) {
  return activeWorkspace !== "dashboard";
}

export function dashboardHrefForWorkspaceRole(role?: string | null) {
  if (role === "delegate") return "/delegate";
  if (role === "warehouse_hero") return "/warehouse-hero";
  return "/";
}
