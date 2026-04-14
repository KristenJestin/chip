CREATE TABLE `criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`feature_id` text NOT NULL,
	`phase_id` integer,
	`description` text NOT NULL,
	`satisfied` integer DEFAULT 0 NOT NULL,
	`satisfied_at` integer,
	`verified_by` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_criteria_feature_id_features_id_fk` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`)
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`feature_id` text NOT NULL,
	`session_id` integer,
	`pass` text NOT NULL,
	`severity` text NOT NULL,
	`category` text,
	`description` text NOT NULL,
	`task_id` integer,
	`resolution` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_findings_feature_id_features_id_fk` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`),
	CONSTRAINT `fk_findings_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `type` text DEFAULT 'feature' NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `parent_task_id` integer;