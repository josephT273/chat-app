import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import "./index.css";

export function App() {
  const [status, setStatus] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const socket = new WebSocket("ws://localhost:3000/ws");
    wsRef.current = socket;

    socket.onopen = () => {
      setStatus(true);
    };

    socket.onmessage = (e) => {
      const msg = e.data.toString();
      setLog((prev) => [...prev, msg]);
    };

    socket.onclose = () => {
      setStatus(false);
    };

    socket.onerror = () => {
      setStatus(false);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message.trim());
      setMessage("");
    }
  };
  return (
    <div className="container mx-auto p-8 text-start relative z-10">
      <Card className="w-125">
        <CardHeader className="gap-4">
          <CardTitle className="text-3xl font-bold">Chat App</CardTitle>
          <CardDescription>
            Simple chat app with react + bun + websocket
            <h1 className={status ? "text-green-500" : "text-red-500"}>
              {status ? `CONNECTED` : `DISCONNECTED`}
            </h1>
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-gray-100  m-5 rounded p-4">
          {log.map((l, i) => (
            <p key={i.toExponential()}>{l}</p>
          ))}
        </CardContent>

        <form
          className="p-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            placeholder="Message goes here..."
            value={message}
            className="mb-2"
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            type="submit"
            disabled={!status}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Send Test Message
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default App;
