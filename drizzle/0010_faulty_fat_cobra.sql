CREATE TABLE `surgeryDeliveryProofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surgeryId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`originalName` varchar(220) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`note` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surgeryDeliveryProofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surgeryImplants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surgeryId` int NOT NULL,
	`implantName` varchar(220) NOT NULL,
	`quantity` int NOT NULL,
	`lotNumber` varchar(160),
	`serialNumber` varchar(160),
	`notes` text,
	`registeredBy` int NOT NULL,
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surgeryImplants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `surgeries` ADD `notifiedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `calendarStatus` enum('notified','confirmed','postponed','cancelled','completed') DEFAULT 'notified' NOT NULL;--> statement-breakpoint
CREATE INDEX `surgery_delivery_proofs_surgery_idx` ON `surgeryDeliveryProofs` (`surgeryId`);--> statement-breakpoint
CREATE INDEX `surgery_implants_surgery_idx` ON `surgeryImplants` (`surgeryId`);