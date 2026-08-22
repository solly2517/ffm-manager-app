CREATE TABLE `travelExpenseClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimantId` int NOT NULL,
	`managerApproverId` int NOT NULL,
	`operationalApproverId` int NOT NULL,
	`claimDate` timestamp NOT NULL,
	`department` varchar(160),
	`jobNature` varchar(240),
	`transportMode` enum('car','plane','car_and_plane','other') NOT NULL DEFAULT 'other',
	`ticketReference` varchar(180),
	`estimatedDays` int,
	`tripSegmentsJson` text NOT NULL,
	`jobReport` text,
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`currency` varchar(3) NOT NULL DEFAULT 'SAR',
	`status` enum('pending','accepted','released') NOT NULL DEFAULT 'pending',
	`managerApprovedAt` timestamp,
	`operationalApprovedAt` timestamp,
	`releasedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `travelExpenseClaims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `travelExpenseLines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`claimId` int NOT NULL,
	`category` enum('hotel','car_taxi','fuel_invoice','maintenance','food','air_ticket','others') NOT NULL,
	`description` varchar(240),
	`days` int,
	`amountPerDay` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`remarks` text,
	`distanceKm` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `travelExpenseLines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `travel_expense_claimant_idx` ON `travelExpenseClaims` (`claimantId`);--> statement-breakpoint
CREATE INDEX `travel_expense_manager_approver_idx` ON `travelExpenseClaims` (`managerApproverId`);--> statement-breakpoint
CREATE INDEX `travel_expense_operational_approver_idx` ON `travelExpenseClaims` (`operationalApproverId`);--> statement-breakpoint
CREATE INDEX `travel_expense_status_idx` ON `travelExpenseClaims` (`status`);--> statement-breakpoint
CREATE INDEX `travel_expense_claim_date_idx` ON `travelExpenseClaims` (`claimDate`);--> statement-breakpoint
CREATE INDEX `travel_expense_line_claim_idx` ON `travelExpenseLines` (`claimId`);--> statement-breakpoint
CREATE INDEX `travel_expense_line_category_idx` ON `travelExpenseLines` (`category`);