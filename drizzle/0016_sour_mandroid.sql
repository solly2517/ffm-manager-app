CREATE TABLE `userNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actorId` int,
	`kind` varchar(120) NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`entityType` varchar(80),
	`entityId` int,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_notification_user_read_idx` ON `userNotifications` (`userId`,`readAt`);--> statement-breakpoint
CREATE INDEX `user_notification_created_idx` ON `userNotifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `user_notification_entity_idx` ON `userNotifications` (`entityType`,`entityId`);