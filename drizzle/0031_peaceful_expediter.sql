CREATE TABLE `manager_directions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topManagerId` int NOT NULL,
	`managerId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`details` text,
	`dueDate` timestamp,
	`status` enum('open','completed') NOT NULL DEFAULT 'open',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manager_directions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manager_seniorities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`level` enum('manager','top_manager') NOT NULL DEFAULT 'manager',
	`setBy` int NOT NULL,
	`setAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_seniorities_id` PRIMARY KEY(`id`),
	CONSTRAINT `manager_seniority_manager_unique` UNIQUE(`managerId`)
);
--> statement-breakpoint
CREATE TABLE `top_manager_manager_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topManagerId` int NOT NULL,
	`managerId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `top_manager_manager_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `top_manager_manager_pair_unique` UNIQUE(`topManagerId`,`managerId`)
);
--> statement-breakpoint
CREATE INDEX `manager_direction_top_manager_idx` ON `manager_directions` (`topManagerId`);--> statement-breakpoint
CREATE INDEX `manager_direction_manager_idx` ON `manager_directions` (`managerId`);--> statement-breakpoint
CREATE INDEX `manager_direction_status_idx` ON `manager_directions` (`status`);--> statement-breakpoint
CREATE INDEX `manager_seniority_level_idx` ON `manager_seniorities` (`level`);--> statement-breakpoint
CREATE INDEX `top_manager_manager_top_idx` ON `top_manager_manager_assignments` (`topManagerId`);--> statement-breakpoint
CREATE INDEX `top_manager_manager_manager_idx` ON `top_manager_manager_assignments` (`managerId`);