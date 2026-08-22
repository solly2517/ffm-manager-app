ALTER TABLE `dailyActivityReports` ADD `clientId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `dailyActivityReports` ADD `doctorId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` ADD `clientId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` ADD `doctorId` int NOT NULL;--> statement-breakpoint
CREATE INDEX `daily_activity_reports_client_idx` ON `dailyActivityReports` (`clientId`);--> statement-breakpoint
CREATE INDEX `daily_activity_reports_doctor_idx` ON `dailyActivityReports` (`doctorId`);--> statement-breakpoint
CREATE INDEX `weekly_visit_plans_client_idx` ON `weeklyVisitPlans` (`clientId`);--> statement-breakpoint
CREATE INDEX `weekly_visit_plans_doctor_idx` ON `weeklyVisitPlans` (`doctorId`);