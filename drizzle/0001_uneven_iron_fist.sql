CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80),
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(220) NOT NULL,
	`province` varchar(120),
	`city` varchar(120),
	`address` text,
	`contactPerson` varchar(160),
	`phone` varchar(50),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`specialty` varchar(140),
	`department` varchar(140),
	`phone` varchar(50),
	`email` varchar(320),
	`relationship` enum('new','warm','kol','cold') NOT NULL DEFAULT 'new',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`kind` enum('photo','audio','signature','document') NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`mimeType` varchar(120),
	`sizeBytes` int,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `geography` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('province','city') NOT NULL,
	`name` varchar(140) NOT NULL,
	`parentId` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `geography_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`role` enum('user','manager','delegate') NOT NULL DEFAULT 'delegate',
	`invitedBy` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surgeries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`delegateId` int NOT NULL,
	`surgeryDate` timestamp NOT NULL,
	`hospital` varchar(220),
	`surgeon` varchar(180),
	`procedureName` varchar(220),
	`status` enum('pending','partial','collected') NOT NULL DEFAULT 'pending',
	`quotation` decimal(12,2),
	`invoice` decimal(12,2),
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surgeries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delegateId` int NOT NULL,
	`clientId` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`checkInAt` timestamp,
	`checkOutAt` timestamp,
	`checkInLat` decimal(10,7),
	`checkInLng` decimal(10,7),
	`checkOutLat` decimal(10,7),
	`checkOutLng` decimal(10,7),
	`report` text,
	`clientSignatureUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `visits_task_unique` UNIQUE(`taskId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','manager','delegate','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `auditEvents` (`actorId`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `auditEvents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `clients_name_idx` ON `clients` (`name`);--> statement-breakpoint
CREATE INDEX `clients_city_idx` ON `clients` (`city`);--> statement-breakpoint
CREATE INDEX `doctors_client_idx` ON `doctors` (`clientId`);--> statement-breakpoint
CREATE INDEX `evidence_visit_idx` ON `evidence` (`visitId`);--> statement-breakpoint
CREATE INDEX `geography_parent_idx` ON `geography` (`parentId`);--> statement-breakpoint
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX `invitations_expires_idx` ON `invitations` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `messages_recipient_idx` ON `messages` (`recipientId`);--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `tasks_delegate_idx` ON `tasks` (`delegateId`);--> statement-breakpoint
CREATE INDEX `tasks_schedule_idx` ON `tasks` (`scheduledAt`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);