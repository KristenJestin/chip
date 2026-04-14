CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`feature_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`phase_id` integer,
	`summary` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	CONSTRAINT `fk_sessions_feature_id_features_id_fk` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`)
);
--> statement-breakpoint
ALTER TABLE `features` ADD `stage` text DEFAULT 'planning' NOT NULL;