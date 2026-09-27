ALTER TABLE `users` MODIFY COLUMN `locationSharing` boolean NOT NULL DEFAULT true;
UPDATE `users` SET `locationSharing` = true WHERE `role` IN ('delegate', 'warehouse_hero') AND `locationSharing` = false;
