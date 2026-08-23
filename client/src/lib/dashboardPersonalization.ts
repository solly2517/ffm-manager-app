export type DashboardTask = { scheduledAt: Date | string; status: string };

export function dashboardEmptyCardPreferenceKey(userId?: number) {
  return `ffm-dashboard-hide-empty-cards:${userId ?? "anonymous"}`;
}

export function saturdayWorkweekBounds(now = new Date()) {
  const start = new Date(now);
  const offset = (start.getDay() + 1) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function weeklyOperationsSummary(tasks: DashboardTask[], overdueCount: number, now = new Date()) {
  const { start, end } = saturdayWorkweekBounds(now);
  const weekTasks = tasks.filter(task => {
    const scheduledAt = new Date(task.scheduledAt);
    return !Number.isNaN(scheduledAt.getTime()) && scheduledAt >= start && scheduledAt <= end;
  });
  const completed = weekTasks.filter(task => task.status === "completed").length;
  return { start, end, planned: weekTasks.length, completed, open: weekTasks.length - completed, overdueCount };
}
