import index from "./index.html";
import { auth } from "./lib/auth";

const server = Bun.serve({
	routes: {
		"/api/auth/*": (req) => auth.handler(req),
		"/*": index,
	},

	fetch(req, server) {
		const url = new URL(req.url);

		if (url.pathname.startsWith("/ws")) {
			if (server.upgrade(req)) {
				return;
			}
			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		return new Response("Not Found", { status: 404 });
	},

	websocket: {
		open(ws) {
			const sessionID = Math.random().toString(36).slice(2, 10);
			ws.subscribe("chat");
			ws.send(`[SERVER] Connected. Session: ${sessionID}`);
		},

		message(ws, message) {
			console.log(ws);
			server.publish("chat", `[${new Date().toLocaleTimeString()}] ${message}`);
		},

		close(ws, code, reason) {
			console.log(ws);
			console.log("Closed", code, reason);
		},
	},
});

console.log(`Server running → wss://localhost:${server.port}`);
