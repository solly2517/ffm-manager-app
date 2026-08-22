ALTER TABLE `dailyActivityReports` MODIFY COLUMN `delegateId` int;--> statement-breakpoint
ALTER TABLE `dailyActivityReports` MODIFY COLUMN `status` enum('submitted','reviewed','manager_recorded') NOT NULL DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` MODIFY COLUMN `delegateId` int;--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` MODIFY COLUMN `status` enum('pending','approved','rejected','manager_recorded') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `dailyActivityReports` ADD `authorId` int;--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` ADD `authorId` int;--> statement-breakpoint
UPDATE `dailyActivityReports` SET `authorId` = `delegateId` WHERE `authorId` IS NULL;--> statement-breakpoint
UPDATE `weeklyVisitPlans` SET `authorId` = `delegateId` WHERE `authorId` IS NULL;--> statement-breakpoint
ALTER TABLE `dailyActivityReports` MODIFY COLUMN `authorId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` MODIFY COLUMN `authorId` int NOT NULL;--> statement-breakpoint
CREATE INDEX `daily_activity_reports_author_idx` ON `dailyActivityReports` (`authorId`);--> statement-breakpoint
CREATE INDEX `weekly_visit_plans_author_idx` ON `weeklyVisitPlans` (`authorId`);
