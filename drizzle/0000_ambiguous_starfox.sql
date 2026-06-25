CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watchlist_item_id` integer NOT NULL,
	`alert_type` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`threshold` real,
	`message` text,
	`fired_at` integer,
	`snoozed_until` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`watchlist_item_id`) REFERENCES `watchlist_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conviction_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watchlist_item_id` integer NOT NULL,
	`fundamental_score` real DEFAULT 0 NOT NULL,
	`valuation_score` real DEFAULT 0 NOT NULL,
	`momentum_score` real DEFAULT 0 NOT NULL,
	`thesis_score` real DEFAULT 0 NOT NULL,
	`why_now_score` real DEFAULT 0 NOT NULL,
	`total_score` real DEFAULT 0 NOT NULL,
	`score_band` text DEFAULT 'WATCH' NOT NULL,
	`calculated_at` integer NOT NULL,
	FOREIGN KEY (`watchlist_item_id`) REFERENCES `watchlist_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stock_id` integer NOT NULL,
	`date` integer NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real NOT NULL,
	`volume` integer,
	`adj_close` real,
	FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `research_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watchlist_item_id` integer NOT NULL,
	`source` text DEFAULT 'USER' NOT NULL,
	`content` text NOT NULL,
	`tags` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`watchlist_item_id`) REFERENCES `watchlist_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`name` text NOT NULL,
	`sector` text,
	`industry` text,
	`market_cap` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stocks_ticker_unique` ON `stocks` (`ticker`);--> statement-breakpoint
CREATE TABLE `theses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watchlist_item_id` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`bull_case` text,
	`bear_case` text,
	`key_assumptions` text,
	`target_price` real,
	`time_horizon` text,
	`drift_status` text DEFAULT 'ON_TRACK' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`watchlist_item_id`) REFERENCES `watchlist_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stock_id` integer NOT NULL,
	`state` text DEFAULT 'DISCOVERY' NOT NULL,
	`added_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`notes` text,
	`target_entry_price` real,
	`average_cost_basis` real,
	`position_size` integer,
	`exit_price` real,
	`exit_reason` text,
	FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `why_now_signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stock_id` integer NOT NULL,
	`signal_type` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`description` text,
	`detected_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`stock_id`) REFERENCES `stocks`(`id`) ON UPDATE no action ON DELETE cascade
);
