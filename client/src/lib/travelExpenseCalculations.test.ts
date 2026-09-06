import { describe, expect, it } from "vitest";
import { calculateTravelExpenseClaimTotal, calculateTravelExpenseLineTotal } from "./travelExpenseCalculations";

describe("travel expense calculations", () => {
  it("calculates a line from days and rate with currency-safe precision", () => {
    expect(calculateTravelExpenseLineTotal({ days: 2, amountPerDay: 225.5 })).toBe(451);
    expect(calculateTravelExpenseLineTotal({ days: 3, amountPerDay: 9.95 })).toBe(29.85);
  });

  it("uses at least one day and prevents negative rates from reducing a claim", () => {
    expect(calculateTravelExpenseLineTotal({ days: 0, amountPerDay: 10 })).toBe(10);
    expect(calculateTravelExpenseLineTotal({ days: 2, amountPerDay: -20 })).toBe(0);
  });

  it("totals independent lines before the server recalculates the submitted claim", () => {
    expect(calculateTravelExpenseClaimTotal([
      { days: 2, amountPerDay: 225.5 },
      { days: 1, amountPerDay: 37.25 },
    ])).toBe(488.25);
  });
});
