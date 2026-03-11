import "dotenv/config";
import { and, eq, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import index from "./index.html";
import { auth } from "./lib/auth";
import ChatAppEncryption from "./lib/chat/encription";
import { db } from "./lib/schema/connection";
import { chatRoom, message } from "./lib/schema/schema";

const encryption = (key: string, iv: string) => new ChatAppEncryption(key, iv);

export const generateKey = (userID: string, date: Date): string => {
	return createHash("md5")
		.update(userID + date.getTime().toString())
		.digest("hex")
		.substring(0, 8)
		.toUpperCase();
};

export const generateRoomId = (userOne: string, userTwo: string): string => {
	return createHash("md5")
		.update(userOne + userTwo)
		.digest("hex")
		.substring(0, 16)
		.toUpperCase();
};

type ClientMessage =
	| { type: "join"; targetUserId: string }
	| { type: "message"; roomId: string; text: string };

type WSData = {
	userId: string;
	roomId?: string;
};

const server = Bun.serve<WSData>({
	routes: {
		"/api/auth/*": (req: Request) => auth.handler(req),
		"/*": index,
	},

	async fetch(req, server) {
		const url = new URL(req.url);

		if (url.pathname.startsWith("/ws")) {
			const session = await auth.api.getSession({
				headers: req.headers,
			});

			if (!session) {
				return new Response("Unauthorized", { status: 401 });
			}
			const upgraded = server.upgrade(req, {
				data: {
					userId: session.user.id,
					roomId: undefined,
				},
			});
			if (upgraded) return;
			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		return new Response("Not Found", { status: 404 });
	},

	websocket: {
		async open(ws) {
			ws.send(JSON.stringify({ type: "connected", userId: ws.data.userId }));
		},

		async message(ws, raw) {
			const userId = ws.data.userId;
			let payload: ClientMessage;
			try {
				payload = JSON.parse(raw as string);
			} catch {
				ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
				return;
			}

			if (payload.type === "join") {
				const { targetUserId } = payload;
				const roomId = generateRoomId(userId, targetUserId);

				let room = await db.query.chatRoom.findFirst({
					where: or(
						and(
							eq(chatRoom.memberOne, userId),
							eq(chatRoom.memberTwo, targetUserId),
						),
						and(
							eq(chatRoom.memberOne, targetUserId),
							eq(chatRoom.memberTwo, userId),
						),
					),
				});

				if (!room) {
					const [newRoom] = await db
						.insert(chatRoom)
						.values({ id: roomId, memberOne: userId, memberTwo: targetUserId })
						.returning();
					room = newRoom;
				}

				if (ws.data.roomId) ws.unsubscribe(ws.data.roomId);
				if (!room) {
					ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
					return;
				}

				ws.data.roomId = room.id;
				ws.subscribe(room.id);

				const history = await db.query.message.findMany({
					where: eq(message.chatRoomId, room?.id),
					with: { sender: true },
					orderBy: (m, { asc }) => asc(m.createdAt),
					limit: 50,
				});

				ws.send(
					JSON.stringify({
						type: "history",
						roomId: room.id,
						messages: history.map((m) => ({
							id: m.id,
							text: encryption(
								generateKey(userId, m.createdAt),
								generateKey(targetUserId, m.createdAt),
							).decryptMessage(m.message),
							senderId: m.senderId,
							senderName: m.sender.name,
							createdAt: m.createdAt,
						})),
					}),
				);
				return;
			}

			if (payload.type === "message") {
				const { roomId, text } = payload;

				if (!text.trim()) return;

				const room = await db.query.chatRoom.findFirst({
					where: and(
						eq(chatRoom.id, roomId),
						or(eq(chatRoom.memberOne, userId), eq(chatRoom.memberTwo, userId)),
					),
				});

				if (!room) {
					ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
					return;
				}

				const now = new Date();

				const encrypted = encryption(
					generateKey(userId, now),
					generateKey(
						room.memberOne === userId ? room.memberTwo : room.memberOne,
						now,
					),
				).encryptMessage(text);

				const [saved] = await db
					.insert(message)
					.values({
						message: encrypted,
						chatRoomId: roomId,
						senderId: userId,
						createdAt: now,
					})
					.returning();

				server.publish(
					roomId,
					JSON.stringify({
						type: "message",
						roomId,
						text,
						senderId: userId,
						createdAt: saved?.createdAt,
					}),
				);
			}
		},

		close(ws, code, reason) {
			if (ws.data.roomId) ws.unsubscribe(ws.data.roomId);
			console.log("Closed", code, reason);
		},
	},
});

console.log(`Server running → http://localhost:${server.port}`);
