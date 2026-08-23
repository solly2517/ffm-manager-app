export type TravelExpenseSummaryClaim = { claimDate: Date | string; department?: string | null; currency?: string | null; totalAmount: number | string };

export function travelExpenseDateRangeError(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return "Choose valid start and end dates.";
  if (new Date(`${from}T00:00:00.000Z`).getTime() > new Date(`${to}T00:00:00.000Z`).getTime()) return "The export end date must be on or after the start date.";
  return null;
}

export function claimsWithinTravelExpenseRange<T extends TravelExpenseSummaryClaim>(claims: T[], from: string, to: string) {
  const endExclusive = new Date(`${to}T00:00:00.000Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const start = new Date(`${from}T00:00:00.000Z`);
  return claims.filter(claim => { const date = new Date(claim.claimDate); return date >= start && date < endExclusive; });
}

export function travelExpenseDepartmentCurrencySummary(claims: TravelExpenseSummaryClaim[]) {
  const totals = new Map<string, { department: string; currency: string; totalAmount: number; claimCount: number }>();
  for (const claim of claims) {
    const department = claim.department?.trim() || "Unspecified department";
    const currency = claim.currency?.trim().toUpperCase() || "SAR";
    const key = `${department}\u0000${currency}`;
    const current = totals.get(key) ?? { department, currency, totalAmount: 0, claimCount: 0 };
    current.totalAmount += Number(claim.totalAmount) || 0;
    current.claimCount += 1;
    totals.set(key, current);
  }
  return Array.from(totals.values()).map(row => ({ ...row, totalAmount: Math.round(row.totalAmount * 100) / 100 })).sort((left, right) => left.department.localeCompare(right.department) || left.currency.localeCompare(right.currency));
}

export function travelExpenseRollingMonthlyTrend(claims: TravelExpenseSummaryClaim[], monthCount = 6, asOf = new Date()) {
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - (monthCount - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
  const currencies = new Map<string, Map<string, { totalAmount: number; claimCount: number }>>();
  for (const claim of claims) {
    const month = new Date(claim.claimDate).toISOString().slice(0, 7);
    if (!months.includes(month)) continue;
    const currency = claim.currency?.trim().toUpperCase() || "SAR";
    const byMonth = currencies.get(currency) ?? new Map();
    const current = byMonth.get(month) ?? { totalAmount: 0, claimCount: 0 };
    current.totalAmount += Number(claim.totalAmount) || 0;
    current.claimCount += 1;
    byMonth.set(month, current);
    currencies.set(currency, byMonth);
  }
  return {
    months,
    series: Array.from(currencies.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([currency, byMonth]) => ({
      currency,
      points: months.map(month => {
        const value = byMonth.get(month) ?? { totalAmount: 0, claimCount: 0 };
        return { month, totalAmount: Math.round(value.totalAmount * 100) / 100, claimCount: value.claimCount };
      }),
    })),
  };
}
