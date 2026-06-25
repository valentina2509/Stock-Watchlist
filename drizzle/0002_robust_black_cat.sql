CREATE TABLE `valuation_scenarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watchlist_item_id` integer NOT NULL,
	`method` text NOT NULL,
	`bear_assumptions` text NOT NULL,
	`base_assumptions` text NOT NULL,
	`bull_assumptions` text NOT NULL,
	`bear_price` real,
	`base_price` real,
	`bull_price` real,
	`current_price` real,
	`calculated_at` integer NOT NULL,
	FOREIGN KEY (`watchlist_item_id`) REFERENCES `watchlist_items`(`id`) ON UPDATE no action ON DELETE cascade
);
