CREATE TABLE `features` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`feature_id` text NOT NULL,
	`phase_id` integer,
	`task_id` integer,
	`source` text,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_logs_feature_id_features_id_fk` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`)
);
--> statement-breakpoint
CREATE TABLE `phases` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`feature_id` text NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	CONSTRAINT `fk_phases_feature_id_features_id_fk` FOREIGN KEY (`feature_id`) REFERENCES `features`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`phase_id` integer NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`created_at` integer NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	CONSTRAINT `fk_tasks_phase_id_phases_id_fk` FOREIGN KEY (`phase_id`) REFERENCES `phases`(`id`)
);
