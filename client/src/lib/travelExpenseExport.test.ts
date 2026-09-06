import { describe, expect, it } from "vitest";
import { buildTravelExpenseAccountingWorkbook, travelExpenseClaimsCsv } from "./travelExpenseExport";

const claims = [{ id: 12, claimantName: "=Formula claimant", claimantEmail: "claimant@example.com", claimDate: "2026-08-03T12:00:00.000Z", department: "Clinical", jobNature: "Hospital visit", totalAmount: 125, currency: "SAR", status: "released", managerApproverName: "Manager", managerApprovedAt: "2026-08-04T12:00:00.000Z", operationalApproverName: "Operational Manager", operationalApprovedAt: "2026-08-05T12:00:00.000Z", releasedAt: "2026-08-06T12:00:00.000Z", ticketReference: "TK-1", lines: [{ category: "hotel", description: "Accommodation", days: 1, amountPerDay: 125, totalAmount: 125, remarks: "=unsafe" }] }];

describe("monthly Travel Expense exports", () => {
  it("builds claims and expense-line Excel sheets", () => {
    const workbook = buildTravelExpenseAccountingWorkbook(claims);
    expect(workbook.SheetNames).toEqual(["Travel claims", "Expense lines"]);
  });

  it("neutralizes spreadsheet formulas in CSV data", () => {
    const csv = travelExpenseClaimsCsv(claims);
    expect(csv).toContain("'=Formula claimant");
    expect(csv).toContain("Claim ID");
  });

  it("builds Arabic accounting sheets with right-to-left metadata and a UTF-8 CSV marker", () => {
    const workbook = buildTravelExpenseAccountingWorkbook(claims, "ar");
    expect(workbook.SheetNames).toEqual(["مطالبات السفر", "بنود المصروفات"]);
    const claimsSheet = workbook.Sheets["مطالبات السفر"] as typeof workbook.Sheets[string] & { "!views"?: Array<{ rightToLeft?: boolean }> };
    expect(claimsSheet["!views"]?.[0]?.rightToLeft).toBe(true);
    const csv = travelExpenseClaimsCsv(claims, "ar");
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csv).toContain("رقم المطالبة");
    expect(csv).toContain("'=Formula claimant");
  });
});
