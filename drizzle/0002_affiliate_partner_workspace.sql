CREATE TABLE `affiliate_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64) NOT NULL,
	`status` enum('active','draft','paused') NOT NULL DEFAULT 'draft',
	`primaryUrl` varchar(1024) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `affiliate_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partnerId` int NOT NULL,
	`label` varchar(128) NOT NULL,
	`url` varchar(1024) NOT NULL,
	`placement` varchar(128) NOT NULL,
	`peptideId` varchar(64),
	`status` enum('active','draft','paused') NOT NULL DEFAULT 'draft',
	`lastTestedAt` timestamp,
	`lastTestStatus` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_links_id` PRIMARY KEY(`id`)
);
