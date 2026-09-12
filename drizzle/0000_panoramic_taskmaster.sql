CREATE TABLE `collections` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`team_name` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_owner_name` ON `collections` (`owner`,`name`);--> statement-breakpoint
CREATE TABLE `games` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`collection_id` text,
	`payload` text NOT NULL,
	`summary` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `games_owner_collection` ON `games` (`owner`,`collection_id`);