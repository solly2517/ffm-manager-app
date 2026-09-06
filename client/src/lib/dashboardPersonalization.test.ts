import { describe, expect, it } from "vitest";
import { dashboardEmptyCardPreferenceKey, saturdayWorkweekBounds, weeklyOperationsSummary } from "./dashboardPersonalization";

describe("dashboard personalization", () => {
  it("creates a per-user empty-card preference key", () => {
    expect(dashboardEmptyCardPreferenceKey(77)).toBe("ffm-dashboard-hide-empty-cards:77");
  });

  it("uses Saturday through Thursday for the FFM six-day operating week", () => {
    const bounds = saturdayWorkweekBounds(new Date("2026-08-23T12:00:00Z"));
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-08-22");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-08-27");
  });

  it("summarizes only selected-week tasks and retains Work Log alerts", () => {
    const summary = weeklyOperationsSummary([
      { scheduledAt: "2026-08-22T09:00:00Z", status: "completed" },
      { scheduledAt: "2026-08-25T09:00:00Z", status: "pending" },
      { scheduledAt: "2026-08-28T09:00:00Z", status: "pending" },
    ], 3, new Date("2026-08-23T12:00:00Z"));
    expect(summary).toMatchObject({ planned: 2, completed: 1, open: 1, overdueCount: 3 });
  });
});
