CREATE TABLE `backupArchives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdBy` int NOT NULL,
	`googleDriveFileId` varchar(160),
	`fileName` varchar(300) NOT NULL,
	`sizeBytes` int,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `backupArchives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `googleDriveBackupConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`googleEmail` varchar(320),
	`folderId` varchar(160) NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googleDriveBackupConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `googleDriveBackupConnections_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `backup_archive_creator_idx` ON `backupArchives` (`createdBy`);--> statement-breakpoint
CREATE INDEX `backup_archive_created_idx` ON `backupArchives` (`createdAt`);--> statement-breakpoint
CREATE INDEX `google_drive_backup_connection_user_idx` ON `googleDriveBackupConnections` (`userId`);