import { describe, expect, it, vi, afterEach } from "vitest";
import * as db from "./db";
import { runWeeklyBackupReminder, WEEKLY_BACKUP_REMINDER_TEXT } from "./backupReminder";

afterEach(() => vi.restoreAllMocks());

describe("weekly backup reminder", () => {
  it("records a scheduled reminder trigger only when its durable schedule exists", async () => {
    vi.spyOn(db, "getWeeklyBackupReminderScheduleByTaskUid").mockResolvedValue({ id: 1, scheduleCronTaskUid: "task_backup", lastTriggeredAt: null } as never);
    const record = vi.spyOn(db, "recordWeeklyBackupReminder").mockResolvedValue({ id: 1, scheduleCronTaskUid: "task_backup", lastTriggeredAt: new Date("2026-08-20T08:00:00.000Z") } as never);
    await expect(runWeeklyBackupReminder("task_backup", new Date("2026-08-20T08:00:00.000Z"))).resolves.toEqual({ ok: true, triggeredAt: "2026-08-20T08:00:00.000Z", message: WEEKLY_BACKUP_REMINDER_TEXT });
    expect(record).toHaveBeenCalledWith("task_backup", new Date("2026-08-20T08:00:00.000Z"));
  });

  it("treats an unrecognized scheduled task as an idempotent orphan", async () => {
    vi.spyOn(db, "getWeeklyBackupReminderScheduleByTaskUid").mockResolvedValue(undefined);
    const record = vi.spyOn(db, "recordWeeklyBackupReminder");
    await expect(runWeeklyBackupReminder("unknown_task")).resolves.toEqual({ ok: true, skipped: "orphan" });
    expect(record).not.toHaveBeenCalled();
  });
});
