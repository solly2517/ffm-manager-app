import { describe, expect, it } from "vitest";
import { departmentComparisonRows, departmentExecutiveSummary, departmentMonthlySummaryFilename } from "./departmentMonthlySummaryPdf";

describe("departmentMonthlySummaryFilename", () => {
  it("creates a month-specific PDF filename", () => {
    expect(departmentMonthlySummaryFilename("2026-08")).toBe("ffm-monthly-department-summary-2026-08.pdf");
  });

  it("keeps staffing, task, and Work Log metrics distinct for the comparison chart", () => {
    expect(departmentComparisonRows([{ name: "Clinical", isActive: true, memberCount: 4, managerCount: 1, delegateCount: 2, warehouseHeroCount: 1, taskCount: 9, openTaskCount: 3, weeklyPlanCount: 2, dailyReportCount: 6 }])).toEqual([{ name: "Clinical", members: 4, tasks: 9, workLog: 8 }]);
  });

  it("builds an executive summary from live department measures without combining distinct metrics", () => {
    const totals = [{ name: "Clinical", isActive: true, memberCount: 4, managerCount: 1, delegateCount: 2, warehouseHeroCount: 1, taskCount: 9, openTaskCount: 3, weeklyPlanCount: 2, dailyReportCount: 6 }, { name: "Logistics", isActive: true, memberCount: 3, managerCount: 1, delegateCount: 1, warehouseHeroCount: 1, taskCount: 5, openTaskCount: 1, weeklyPlanCount: 4, dailyReportCount: 7 }];
    expect(departmentExecutiveSummary(totals)).toMatchObject({ memberCount: 7, taskCount: 14, workLogCount: 19, topTaskDepartment: { name: "Clinical" }, topWorkLogDepartment: { name: "Logistics" } });
  });
});
