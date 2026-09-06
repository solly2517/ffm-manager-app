CREATE TABLE `monthly_department_report_shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`createdBy` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`commentary` text,
	`reportPayload` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_department_report_shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_department_report_shares_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `monthly_department_report_share_creator_idx` ON `monthly_department_report_shares` (`createdBy`);--> statement-breakpoint
CREATE INDEX `monthly_department_report_share_expiry_idx` ON `monthly_department_report_shares` (`expiresAt`);