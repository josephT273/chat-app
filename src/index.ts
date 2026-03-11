import "dotenv/config";
import { and, eq, ilike, not, or } from "drizzle-orm";
import { createHash } from "node:crypto";
import index from "./index.html";
import { auth } from "./lib/auth";
import ChatAppEncryption from "./lib/chat/encription";
import { generateRoomId } from "./lib/chat/generateRoom";
import { db } from "./lib/schema/connection";
import { chatRoom, message, user } from "./lib/schema/schema";

const encryption = (key: string, iv: string) => new ChatAppEncryption(key, iv);

export const generateKey = (userID: string, date: Date): string => {
	return createHash("md5")
		.update(userID + date.getTime().toString())
		.digest("hex")
		.substring(0, 8)
		.toUpperCase();
};

type ClientMessage =
	| { type: "join"; targetUserId: string }
	| { type: "message"; receiverId: string; text: string };

type WSData = {
	userId: string;
	roomId?: string;
	otherUserId?: string;
};

export const getUserId = async (req: Request): Promise<string | null> => {
	const session = await auth.api.getSession({
		headers: req.headers,
	});

	if (!session) return null;

	return session.user.id;
};

const server = Bun.serve<WSData>({
	routes: {
		"/api/auth/*": (req: Request) => auth.handler(req),
		"/users/:name": {
			GET: async (req: Bun.BunRequest) => {
				const userId = await getUserId(req);
				if (!userId) return new Response("Unauthorized", { status: 401 });

				const name = req.params.name?.trim();

				if (!name || name.length < 2) {
					return Response.json([]);
				}

				const users = await db
					.select({
						id: user.id,
						name: user.name,
						image: user.image,
						email: user.email,
					})
					.from(user)
					.where(and(not(eq(user.id, userId)), ilike(user.name, `%${name}%`)))
					.limit(10);
				return Response.json(
					users.length === 0 ? { message: "No users found" } : users,
				);
			},
		},
		"/rooms": {
			GET: async (req: Bun.BunRequest) => {
				const userId = await getUserId(req);
				if (!userId) return new Response("Unauthorized", { status: 401 });

				const rooms = await db.query.chatRoom.findMany({
					where: or(
						eq(chatRoom.memberOne, userId),
						eq(chatRoom.memberTwo, userId),
					),
					with: {
						memberOne: true,
						memberTwo: true,
						messages: {
							orderBy: (m, { desc }) => desc(m.createdAt),
							limit: 1,
						},
					},
				});

				return Response.json(
					rooms.map((r) => ({
						roomId: r.id,
						otherUser: r.memberOne.id === userId ? r.memberTwo : r.memberOne,
						lastMessage: r.messages[0] ?? null,
					})),
				);
			},
		},
		"/*": index,
	},

	async fetch(req, server) {
		const url = new URL(req.url);

		if (url.pathname.startsWith("/ws")) {
			const session = await getUserId(req);

			if (!session) {
				return new Response("Unauthorized", { status: 401 });
			}
			const upgraded = server.upgrade(req, {
				data: {
					userId: session,
					roomId: undefined,
					otherUserId: undefined,
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

				if (!room) return;

				if (ws.data.roomId) ws.unsubscribe(ws.data.roomId);
				ws.data.roomId = room.id;
				ws.data.otherUserId = targetUserId;
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
						messages: history.map((m) => {
							const senderKey = generateKey(m.senderId, m.createdAt);
							const receiverId =
								m.senderId === room.memberOne ? room.memberTwo : room.memberOne;
							const receiverKey = generateKey(receiverId, m.createdAt);

							let text = "[encrypted]";
							try {
								text = encryption(senderKey, receiverKey).decryptMessage(
									m.message,
								);
							} catch { }

							return {
								id: m.id,
								text,
								senderId: m.senderId,
								senderName: m.sender.name,
								createdAt: m.createdAt,
							};
						}),
					}),
				);
				return;
			}

			if (payload.type === "message") {
				const { receiverId, text } = payload;
				if (!text.trim()) return;

				const roomId = generateRoomId(userId, receiverId);

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
				const otherUserId =
					room.memberOne === userId ? room.memberTwo : room.memberOne;

				const encrypted = encryption(
					generateKey(userId, now),
					generateKey(otherUserId, now),
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
