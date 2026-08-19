CREATE TABLE `visitPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delegateId` int NOT NULL,
	`clientId` int NOT NULL,
	`proposedAt` timestamp NOT NULL,
	`notes` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `visit_plans_delegate_idx` ON `visitPlans` (`delegateId`);--> statement-breakpoint
CREATE INDEX `visit_plans_status_idx` ON `visitPlans` (`status`);