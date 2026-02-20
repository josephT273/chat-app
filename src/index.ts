import index from "./index.html";


const server = Bun.serve({
  port: 3000,
  routes: {
    "/*": index
  },

  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response("Internal Server error", { status: 500 });
  },

  websocket: {
    open(ws) {
      const sessionID = Math.random().toString(36).slice(2, 10);
      ws.subscribe("chat")
      ws.send(`[SERVER] Connected. Session: ${sessionID}`);
    },

    message(ws, message) {
      server.publish("chat", `[${new Date().toLocaleTimeString()}] ${message}`);
    },

    close(ws, code, reason) {
      console.log("Closed", code, reason);
    },
  },
});

console.log(`Server running → wss://localhost:${server.port}`);