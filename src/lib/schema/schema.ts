import { relations } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const chatRoom = pgTable(
  "chat_room",
  {
    id: text("id").primaryKey(),
    memberOne: text("member_one").references(() => user.id).notNull(),
    memberTwo: text("member_two").references(() => user.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("chat_room_member_one_idx").on(table.memberOne),
    index("chat_room_member_two_idx").on(table.memberTwo),
  ]
)

export const message = pgTable(
  "message",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    message: text("message").notNull(),
    chatRoomId: text("chat_room_id").references(() => chatRoom.id).notNull(),
    senderId: text("sender_id").references(() => user.id).notNull(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("message_chat_room_idx").on(table.chatRoomId),
    index("message_sender_idx").on(table.senderId),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),

  memberOneRooms: many(chatRoom, {
    relationName: "memberOne",
  }),

  memberTwoRooms: many(chatRoom, {
    relationName: "memberTwo",
  }),

  messages: many(message),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const chatRoomRelations = relations(chatRoom, ({ one, many }) => ({
  memberOne: one(user, {
    fields: [chatRoom.memberOne],
    references: [user.id],
    relationName: "memberOne",
  }),

  memberTwo: one(user, {
    fields: [chatRoom.memberTwo],
    references: [user.id],
    relationName: "memberTwo",
  }),

  messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chatRoom: one(chatRoom, {
    fields: [message.chatRoomId],
    references: [chatRoom.id],
  }),

  sender: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
}));
