export function saturdayForDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const daysSinceSaturday = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - daysSinceSaturday);
  return date.toISOString().slice(0, 10);
}

export function canSubmitWorkLog(summary: string, outcomes: string) {
  return summary.trim().length >= 10 && outcomes.trim().length >= 10;
}
