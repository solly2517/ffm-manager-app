CREATE TABLE `super_manager_report_filter_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`query` varchar(160),
	`role` enum('manager','delegate','warehouse_hero'),
	`department` varchar(160),
	`activityFrom` varchar(10),
	`activityTo` varchar(10),
	`activityStatus` enum('pending','approved','rejected','submitted','reviewed','manager_recorded'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `super_manager_report_filter_presets_id` PRIMARY KEY(`id`),
	CONSTRAINT `super_manager_preset_user_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `super_manager_preset_user_idx` ON `super_manager_report_filter_presets` (`userId`);