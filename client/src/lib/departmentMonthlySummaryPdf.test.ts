import { describe, expect, it } from "vitest";
import { departmentComparisonRows, departmentMonthlySummaryFilename } from "./departmentMonthlySummaryPdf";

describe("departmentMonthlySummaryFilename", () => {
  it("creates a month-specific PDF filename", () => {
    expect(departmentMonthlySummaryFilename("2026-08")).toBe("ffm-monthly-department-summary-2026-08.pdf");
  });

  it("keeps staffing, task, and Work Log metrics distinct for the comparison chart", () => {
    expect(departmentComparisonRows([{ name: "Clinical", isActive: true, memberCount: 4, managerCount: 1, delegateCount: 2, warehouseHeroCount: 1, taskCount: 9, openTaskCount: 3, weeklyPlanCount: 2, dailyReportCount: 6 }])).toEqual([{ name: "Clinical", members: 4, tasks: 9, workLog: 8 }]);
  });
});
