CREATE TABLE `client_error_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`message` varchar(500) NOT NULL,
	`stack` text,
	`componentStack` text,
	`route` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `client_error_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `client_error_created_idx` ON `client_error_reports` (`createdAt`);--> statement-breakpoint
CREATE INDEX `client_error_user_idx` ON `client_error_reports` (`userId`);