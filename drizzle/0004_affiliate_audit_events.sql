CREATE TABLE `affiliate_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorOpenId` varchar(64),
	`actorEmail` varchar(320),
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64),
	`summary` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_audit_events_id` PRIMARY KEY(`id`)
);
