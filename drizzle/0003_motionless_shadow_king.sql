CREATE TABLE `manager_delegate_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`delegateId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_delegate_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `manager_delegate_pair_unique` UNIQUE(`managerId`,`delegateId`)
);
--> statement-breakpoint
CREATE INDEX `manager_delegate_manager_idx` ON `manager_delegate_assignments` (`managerId`);--> statement-breakpoint
CREATE INDEX `manager_delegate_delegate_idx` ON `manager_delegate_assignments` (`delegateId`);