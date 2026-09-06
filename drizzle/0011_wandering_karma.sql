CREATE TABLE `implantCatalogue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(220) NOT NULL,
	`manufacturer` varchar(180),
	`productCode` varchar(160),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `implantCatalogue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `surgeries` ADD `lifecycleReason` text;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `lifecycleUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `surgeryImplants` ADD `implantCatalogueId` int;--> statement-breakpoint
CREATE INDEX `implant_catalogue_name_idx` ON `implantCatalogue` (`name`);--> statement-breakpoint
CREATE INDEX `implant_catalogue_active_idx` ON `implantCatalogue` (`isActive`);