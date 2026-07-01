ALTER TABLE leads ADD COLUMN provider_matches JSON DEFAULT NULL AFTER results;
ALTER TABLE leads ADD COLUMN experiment_variant VARCHAR(16) DEFAULT NULL AFTER provider_matches;
