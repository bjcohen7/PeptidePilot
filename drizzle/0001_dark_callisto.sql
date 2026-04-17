CREATE TABLE `affiliate_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` varchar(36) NOT NULL,
	`peptideId` varchar(64) NOT NULL,
	`vendor` varchar(128) NOT NULL,
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`category` varchar(64) NOT NULL,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blog_posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`ageRange` varchar(32) NOT NULL,
	`primaryGoal` varchar(255) NOT NULL,
	`budget` varchar(64) NOT NULL,
	`topPeptideMatch` varchar(64) NOT NULL,
	`tier` int NOT NULL,
	`consentGiven` boolean NOT NULL DEFAULT false,
	`consentTimestamp` timestamp NOT NULL,
	`ipAddress` varchar(64) NOT NULL,
	`rawQuizData` json NOT NULL,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
