ALTER TABLE `affiliate_links` ADD `isGlobal` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `affiliate_links` ADD `sortOrder` int NOT NULL DEFAULT 100;
