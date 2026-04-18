CREATE TABLE `visitor_sessions` (
	`id` varchar(64) NOT NULL,
	`leadId` varchar(36),
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`landingPath` varchar(512) NOT NULL,
	`lastPath` varchar(512),
	`referrer` varchar(1024),
	`utmSource` varchar(255),
	`utmMedium` varchar(255),
	`utmCampaign` varchar(255),
	`utmContent` varchar(255),
	`utmTerm` varchar(255),
	`userAgent` text,
	`pageViewCount` int NOT NULL DEFAULT 0,
	`totalDurationMs` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitor_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`path` varchar(512) NOT NULL,
	`durationMs` int NOT NULL DEFAULT 0,
	`referrer` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `click_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`leadId` varchar(36),
	`path` varchar(512) NOT NULL,
	`label` varchar(255) NOT NULL,
	`targetHref` varchar(1024),
	`eventType` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `click_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD COLUMN `sessionId` varchar(64);
