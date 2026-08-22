ALTER TABLE `weeklyVisitPlans` ADD `scheduleJson` text;--> statement-breakpoint
UPDATE `weeklyVisitPlans` SET `scheduleJson` = '[]' WHERE `scheduleJson` IS NULL;--> statement-breakpoint
ALTER TABLE `weeklyVisitPlans` MODIFY `scheduleJson` text NOT NULL;
