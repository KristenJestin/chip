CREATE TABLE `task_dependencies` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`task_id` integer NOT NULL,
	`blocks_task_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_task_dependencies_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_task_dependencies_blocks_task_id_tasks_id_fk` FOREIGN KEY (`blocks_task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_dep_unique` ON `task_dependencies` (`task_id`,`blocks_task_id`);