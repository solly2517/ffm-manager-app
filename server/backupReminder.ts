import { getWeeklyBackupReminderScheduleByTaskUid, recordWeeklyBackupReminder } from "./db";

export const WEEKLY_BACKUP_REMINDER_TEXT = "Weekly backup reminder: download a fresh backup copy now and confirm the file is stored safely.";

export async function runWeeklyBackupReminder(taskUid: string, triggeredAt = new Date()) {
  const schedule = await getWeeklyBackupReminderScheduleByTaskUid(taskUid);
  if (!schedule) return { ok: true as const, skipped: "orphan" as const };
  await recordWeeklyBackupReminder(taskUid, triggeredAt);
  return { ok: true as const, triggeredAt: triggeredAt.toISOString(), message: WEEKLY_BACKUP_REMINDER_TEXT };
}
