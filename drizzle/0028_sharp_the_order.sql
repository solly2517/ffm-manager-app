ALTER TABLE `warehouse_delivery_proofs` ADD `captureSource` enum('legacy_upload','live_camera') DEFAULT 'legacy_upload' NOT NULL;
