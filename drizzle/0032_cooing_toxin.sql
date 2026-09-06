ALTER TABLE `surgeries` MODIFY COLUMN `delegateId` int;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `assignedManagerId` int;--> statement-breakpoint
CREATE INDEX `surgeries_delegate_idx` ON `surgeries` (`delegateId`);--> statement-breakpoint
CREATE INDEX `surgeries_assigned_manager_idx` ON `surgeries` (`assignedManagerId`);--> statement-breakpoint
CREATE INDEX `surgeries_date_idx` ON `surgeries` (`surgeryDate`);--> statement-breakpoint
CREATE INDEX `surgeries_calendar_status_idx` ON `surgeries` (`calendarStatus`);