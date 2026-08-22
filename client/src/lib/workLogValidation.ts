export function mondayForDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

export function canSubmitWorkLog(summary: string, outcomes: string) {
  return summary.trim().length >= 10 && outcomes.trim().length >= 10;
}
