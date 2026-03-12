DROP INDEX "unread_user_room_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "unread_user_room_unique" ON "unread" USING btree ("user_id","room_id");