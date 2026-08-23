import { describe, expect, it } from "vitest";
import { departmentMonthlySummaryFilename } from "./departmentMonthlySummaryPdf";

describe("departmentMonthlySummaryFilename", () => {
  it("creates a month-specific PDF filename", () => {
    expect(departmentMonthlySummaryFilename("2026-08")).toBe("ffm-monthly-department-summary-2026-08.pdf");
  });
});
