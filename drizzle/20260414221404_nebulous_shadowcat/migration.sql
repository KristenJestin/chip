CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`feature_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`phase_id` integer,
	`task_id` integer,
	`finding_id` integer,
	`session_id` integer,
	`source` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_events_feature_id_features_id_fk` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`),
	CONSTRAINT `fk_events_session_id_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`)
);
