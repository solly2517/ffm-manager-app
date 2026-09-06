CREATE TABLE `warehouse_handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseHeroId` int NOT NULL,
	`recipientName` varchar(160) NOT NULL,
	`note` text,
	`signatureStorageKey` varchar(512) NOT NULL,
	`signatureMimeType` varchar(120) NOT NULL,
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouse_handovers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `warehouse_delivery_proofs` ADD `handoverId` int;--> statement-breakpoint
CREATE INDEX `warehouse_handover_hero_idx` ON `warehouse_handovers` (`warehouseHeroId`);--> statement-breakpoint
CREATE INDEX `warehouse_handover_acknowledged_idx` ON `warehouse_handovers` (`acknowledgedAt`);--> statement-breakpoint
CREATE INDEX `warehouse_handover_created_idx` ON `warehouse_handovers` (`createdAt`);--> statement-breakpoint
CREATE INDEX `warehouse_delivery_proof_handover_idx` ON `warehouse_delivery_proofs` (`handoverId`);