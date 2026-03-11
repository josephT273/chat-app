ALTER TABLE "chat_room" RENAME COLUMN "sender_id" TO "member_one";--> statement-breakpoint
ALTER TABLE "chat_room" RENAME COLUMN "receiver_id" TO "member_two";--> statement-breakpoint
ALTER TABLE "chat_room" DROP CONSTRAINT "chat_room_sender_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "chat_room" DROP CONSTRAINT "chat_room_receiver_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "sender_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_room" ADD CONSTRAINT "chat_room_member_one_user_id_fk" FOREIGN KEY ("member_one") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_room" ADD CONSTRAINT "chat_room_member_two_user_id_fk" FOREIGN KEY ("member_two") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_room_member_one_idx" ON "chat_room" USING btree ("member_one");--> statement-breakpoint
CREATE INDEX "chat_room_member_two_idx" ON "chat_room" USING btree ("member_two");--> statement-breakpoint
CREATE INDEX "message_chat_room_idx" ON "message" USING btree ("chat_room_id");--> statement-breakpoint
CREATE INDEX "message_sender_idx" ON "message" USING btree ("sender_id");