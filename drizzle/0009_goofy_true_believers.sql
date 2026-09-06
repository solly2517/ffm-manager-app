CREATE TABLE `weeklyBackupReminderSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65) NOT NULL,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyBackupReminderSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `weeklyBackupReminderSchedules_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
CREATE INDEX `weekly_backup_reminder_task_uid_idx` ON `weeklyBackupReminderSchedules` (`scheduleCronTaskUid`);