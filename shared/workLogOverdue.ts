type DelegateIdentity = { id: number; name?: string | null; email?: string | null };
type WeeklyPlanRecord = { authorId: number; weekOf: Date | string; status: string };
type DailyReportRecord = { authorId: number; reportDate: Date | string };

const utcDateText = (date: Date) => date.toISOString().slice(0, 10);
const dateOnly = (value: Date | string) => new Date(value).toISOString().slice(0, 10);

export function overdueWeekStart(asOf = new Date()) {
  const day = asOf.getUTCDay();
  const daysSinceSaturday = (day + 1) % 7;
  const start = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - daysSinceSaturday);
  return start;
}

export function overdueWorkLogSummary(input: { delegates: DelegateIdentity[]; weeklyPlans: WeeklyPlanRecord[]; dailyReports: DailyReportRecord[]; asOf?: Date }) {
  const asOf = input.asOf ?? new Date();
  const weekStart = overdueWeekStart(asOf);
  const weekStartText = utcDateText(weekStart);
  const todayText = utcDateText(asOf);
  const completedWorkDays = Array.from({ length: 6 }, (_, index) => {
    const day = new Date(weekStart);
    day.setUTCDate(day.getUTCDate() + index);
    return utcDateText(day);
  }).filter(day => day < todayText);

  const overdueDelegates = input.delegates.flatMap(delegate => {
    const hasWeeklyPlan = input.weeklyPlans.some(plan => plan.authorId === delegate.id && dateOnly(plan.weekOf) === weekStartText && plan.status !== "rejected");
    const reportedDates = new Set(input.dailyReports.filter(report => report.authorId === delegate.id).map(report => dateOnly(report.reportDate)));
    const overdueDailyDates = completedWorkDays.filter(day => !reportedDates.has(day));
    if (hasWeeklyPlan && !overdueDailyDates.length) return [];
    return [{ delegateId: delegate.id, delegateName: delegate.name || delegate.email || "Unnamed Delegate", delegateEmail: delegate.email || null, missingWeeklyPlan: !hasWeeklyPlan, overdueDailyDates }];
  });

  return { weekStart: weekStartText, overdueDelegates, missingWeeklyPlans: overdueDelegates.filter(row => row.missingWeeklyPlan).length, overdueDailyReports: overdueDelegates.reduce((total, row) => total + row.overdueDailyDates.length, 0) };
}
