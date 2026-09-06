export type TravelExpenseAmount = {
  days?: number | null;
  amountPerDay?: number | null;
};

export function calculateTravelExpenseLineTotal(line: TravelExpenseAmount) {
  const days = Math.max(1, Number(line.days ?? 1));
  const amountPerDay = Math.max(0, Number(line.amountPerDay ?? 0));
  return Number((days * amountPerDay).toFixed(2));
}

export function calculateTravelExpenseClaimTotal(lines: TravelExpenseAmount[]) {
  return Number(
    lines
      .reduce((total, line) => total + calculateTravelExpenseLineTotal(line), 0)
      .toFixed(2)
  );
}
