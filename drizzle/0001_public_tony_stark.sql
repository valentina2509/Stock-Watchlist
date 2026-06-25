CREATE TABLE `why_now_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stock_id` integer NOT NULL,
	`total_score` real NOT NULL,
	`is_hot_window` integer DEFAULT false NOT NULL,
	`breakdown` text NOT NULL,
	`calculated_at` integer NOT NULL,
	FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON UPDATE no action ON DELETE cascade
);
