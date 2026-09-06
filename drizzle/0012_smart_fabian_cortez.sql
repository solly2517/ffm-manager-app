ALTER TABLE `surgeries` ADD `hospitalConfirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `implantsAvailable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `delegateReady` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `deliveryPrepared` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `readinessUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `surgeries` ADD `readinessUpdatedBy` int;