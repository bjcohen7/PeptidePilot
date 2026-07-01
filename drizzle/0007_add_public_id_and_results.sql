-- Add public_id column (URL-safe, unguessable identifier for results links)
ALTER TABLE `leads` ADD COLUMN `publicId` varchar(36) NOT NULL;
-- Backfill existing rows: public_id = id (both are nanoids)
UPDATE `leads` SET `publicId` = `id` WHERE `publicId` = '';
CREATE UNIQUE INDEX `publicId` ON `leads` (`publicId`);

-- Add results JSON column for persisted scoring output
ALTER TABLE `leads` ADD COLUMN `results` json;
