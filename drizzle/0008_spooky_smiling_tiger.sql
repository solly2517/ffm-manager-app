CREATE TABLE `warehouse_delivery_proofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouseHeroId` int NOT NULL,
	`note` text,
	`storageKey` varchar(512) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `warehouse_delivery_proofs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `warehouse_delivery_proof_hero_idx` ON `warehouse_delivery_proofs` (`warehouseHeroId`);--> statement-breakpoint
CREATE INDEX `warehouse_delivery_proof_captured_idx` ON `warehouse_delivery_proofs` (`capturedAt`);