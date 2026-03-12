CREATE TABLE "unread" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "unread_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"room_id" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unread" ADD CONSTRAINT "unread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unread" ADD CONSTRAINT "unread_room_id_chat_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "unread_user_idx" ON "unread" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "unread_room_idx" ON "unread" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "unread_user_room_idx" ON "unread" USING btree ("user_id","room_id");