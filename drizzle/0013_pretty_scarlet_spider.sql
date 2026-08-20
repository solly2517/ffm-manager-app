ALTER TABLE `surgeryImplants` ADD `unitPrice` decimal(12,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `surgeryImplants` ADD `currency` varchar(3) DEFAULT 'SAR' NOT NULL;