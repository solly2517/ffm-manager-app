CREATE TABLE `dailyActivityReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delegateId` int NOT NULL,
	`reportDate` timestamp NOT NULL,
	`summary` text NOT NULL,
	`outcomes` text NOT NULL,
	`challenges` text,
	`nextActions` text,
	`status` enum('submitted','reviewed') NOT NULL DEFAULT 'submitted',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`managerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyActivityReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyVisitPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delegateId` int NOT NULL,
	`weekOf` timestamp NOT NULL,
	`objectives` text NOT NULL,
	`plannedVisits` text NOT NULL,
	`supportNeeded` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyVisitPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `daily_activity_reports_delegate_idx` ON `dailyActivityReports` (`delegateId`);--> statement-breakpoint
CREATE INDEX `daily_activity_reports_status_idx` ON `dailyActivityReports` (`status`);--> statement-breakpoint
CREATE INDEX `daily_activity_reports_date_idx` ON `dailyActivityReports` (`reportDate`);--> statement-breakpoint
CREATE INDEX `weekly_visit_plans_delegate_idx` ON `weeklyVisitPlans` (`delegateId`);--> statement-breakpoint
CREATE INDEX `weekly_visit_plans_status_idx` ON `weeklyVisitPlans` (`status`);--> statement-breakpoint
CREATE INDEX `weekly_visit_plans_week_idx` ON `weeklyVisitPlans` (`weekOf`);