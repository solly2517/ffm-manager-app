CREATE TABLE `manager_warehouse_hero_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`managerId` int NOT NULL,
	`warehouseHeroId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manager_warehouse_hero_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `manager_warehouse_hero_pair_unique` UNIQUE(`managerId`,`warehouseHeroId`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_hero_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseHeroId` int NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_hero_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouse_hero_location_unique` UNIQUE(`warehouseHeroId`)
);
--> statement-breakpoint
ALTER TABLE `invitations` MODIFY COLUMN `role` enum('user','manager','delegate','warehouse_hero') NOT NULL DEFAULT 'delegate';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','manager','delegate','warehouse_hero','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `manager_warehouse_hero_manager_idx` ON `manager_warehouse_hero_assignments` (`managerId`);--> statement-breakpoint
CREATE INDEX `manager_warehouse_hero_hero_idx` ON `manager_warehouse_hero_assignments` (`warehouseHeroId`);--> statement-breakpoint
CREATE INDEX `warehouse_hero_location_captured_idx` ON `warehouse_hero_locations` (`capturedAt`);