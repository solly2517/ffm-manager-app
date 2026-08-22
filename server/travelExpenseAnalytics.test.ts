import { describe, expect, it } from "vitest";
import { claimsWithinTravelExpenseRange, travelExpenseDateRangeError, travelExpenseDepartmentCurrencySummary } from "../shared/travelExpenseAnalytics";

describe("Travel Expense analytics", () => {
  it("keeps department totals separated by currency and adds only matching pairs", () => {
    const summary = travelExpenseDepartmentCurrencySummary([
      { claimDate: "2026-08-01", department: "Clinical", currency: "SAR", totalAmount: 100 },
      { claimDate: "2026-08-02", department: "Clinical", currency: "SAR", totalAmount: 25.5 },
      { claimDate: "2026-08-03", department: "Clinical", currency: "USD", totalAmount: 10 },
      { claimDate: "2026-08-04", department: null, currency: "SAR", totalAmount: 50 },
    ]);
    expect(summary).toEqual(expect.arrayContaining([
      { department: "Clinical", currency: "SAR", totalAmount: 125.5, claimCount: 2 },
      { department: "Clinical", currency: "USD", totalAmount: 10, claimCount: 1 },
      { department: "Unspecified department", currency: "SAR", totalAmount: 50, claimCount: 1 },
    ]));
  });

  it("uses an inclusive end date and rejects a reversed accounting export range", () => {
    const claims = [{ id: 1, claimDate: "2026-08-01T00:00:00.000Z", totalAmount: 1 }, { id: 2, claimDate: "2026-08-31T23:59:59.000Z", totalAmount: 2 }, { id: 3, claimDate: "2026-09-01T00:00:00.000Z", totalAmount: 3 }];
    expect(claimsWithinTravelExpenseRange(claims, "2026-08-01", "2026-08-31").map(claim => claim.id)).toEqual([1, 2]);
    expect(travelExpenseDateRangeError("2026-08-31", "2026-08-01")).toContain("end date");
  });
});
