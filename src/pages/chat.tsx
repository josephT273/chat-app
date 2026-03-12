/** biome-ignore-all lint/a11y/useKeyWithClickEvents: explanation */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: explanation */
import axios from "axios";
import type { User } from "better-auth";
import { Search, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/AuthContext";
import {
  decryptMessage,
  encryptMessage,
  generateKey,
} from "@/lib/chat/encryption";

type ChatMessage = {
  id: number | string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: string | Date;
};

type LastMessage = {
  encryptedText: string;
  senderId: string;
  createdAt: string;
};

type RoomEntry = {
  roomId: string;
  memberOneId: string;
  memberTwoId: string;
  otherUser: Pick<User, "id" | "name" | "email" | "image">;
  lastMessage: LastMessage | null;
};

const Avatar = ({
  name,
  size = "md",
  online,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) => {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-11 h-11 text-lg",
    lg: "w-14 h-14 text-2xl",
  };
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="relative shrink-0">
      <div
        className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${online ? "bg-emerald-400" : "bg-slate-300"}`}
        />
      )}
    </div>
  );
};

const decryptLastMessage = (
  lastMsg: LastMessage | null,
  memberOneId: string,
  memberTwoId: string,
): string => {
  if (!lastMsg) return "";
  try {
    const receiverId =
      lastMsg.senderId === memberOneId ? memberTwoId : memberOneId;
    const senderKey = generateKey(
      lastMsg.senderId,
      new Date(lastMsg.createdAt),
    );
    const receiverKey = generateKey(receiverId, new Date(lastMsg.createdAt));
    return decryptMessage(lastMsg.encryptedText, senderKey, receiverKey);
  } catch {
    return "[message]";
  }
};

export function Chat() {
  const { user } = useAuth();

  const wsRef = useRef<WebSocket | null>(null);
  const [wsReady, setWsReady] = useState(false);

  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RoomEntry["otherUser"][]>(
    [],
  );
  const [searching, setSearching] = useState(false);

  const [activeRoom, setActiveRoom] = useState<RoomEntry | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const activeRoomRef = useRef<RoomEntry | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const setActiveRoomBoth = (room: RoomEntry | null) => {
    activeRoomRef.current = room;
    setActiveRoom(room);
  };

  useEffect(() => {
    axios.get<RoomEntry[]>("/rooms").then((res) => {
      if (Array.isArray(res.data)) setRooms(res.data);
    });
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/ws`);
    wsRef.current = socket;
    socket.onopen = () => setWsReady(true);
    socket.onclose = () => setWsReady(false);
    socket.onerror = () => setWsReady(false);

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const currentRoom = activeRoomRef.current;

      if (data.type === "connected" || data.type === "presence") {
        setOnlineUsers(new Set(data.onlineUsers));
        return;
      }

      if (data.type === "history") {
        const decrypted: ChatMessage[] = data.messages.map((m: any) => {
          const receiverId =
            m.senderId === data.memberOneId
              ? data.memberTwoId
              : data.memberOneId;
          const senderKey = generateKey(m.senderId, new Date(m.createdAt));
          const receiverKey = generateKey(receiverId, new Date(m.createdAt));
          return {
            id: m.id,
            text: decryptMessage(m.encryptedText, senderKey, receiverKey),
            senderId: m.senderId,
            senderName: m.senderName,
            createdAt: m.createdAt,
          };
        });
        setMessages(decrypted);
        return;
      }

      if (data.type === "message" && currentRoom) {
        const receiverId =
          data.senderId === data.memberOneId
            ? data.memberTwoId
            : data.memberOneId;
        const senderKey = generateKey(data.senderId, new Date(data.createdAt));
        const receiverKey = generateKey(receiverId, new Date(data.createdAt));
        const text = decryptMessage(data.encryptedText, senderKey, receiverKey);

        setMessages((prev) => [
          ...prev,
          {
            id: data.id ?? Date.now(),
            text,
            senderId: data.senderId,
            senderName:
              data.senderId === user?.id
                ? (user?.name ?? "")
                : (currentRoom.otherUser.name ?? ""),
            createdAt: data.createdAt,
          },
        ]);

        setRooms((prev) =>
          prev.map((r) =>
            r.roomId === data.roomId
              ? {
                  ...r,
                  lastMessage: {
                    encryptedText: data.encryptedText,
                    senderId: data.senderId,
                    createdAt: data.createdAt,
                  },
                }
              : r,
          ),
        );
      }
    };

    return () => socket.close();
  }, [user]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: explanation>
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      axios
        .get(`/users/${searchQuery}`)
        .then((res) =>
          setSearchResults(Array.isArray(res.data) ? res.data : []),
        )
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const joinRoom = (otherUser: RoomEntry["otherUser"]) => {
    setMessages([]);
    setSearchQuery("");
    setSearchResults([]);
    const existing = rooms.find((r) => r.otherUser.id === otherUser.id);
    const room = existing ?? {
      roomId: "",
      memberOneId: user?.id ?? "",
      memberTwoId: otherUser.id,
      otherUser,
      lastMessage: null,
    };
    setActiveRoomBoth(room);
    wsRef.current?.send(
      JSON.stringify({ type: "join", targetUserId: otherUser.id }),
    );
    if (!existing) setRooms((prev) => [room, ...prev]);
  };

  const sendMessage = () => {
    if (!input.trim() || !activeRoom || !wsReady || !user) return;
    const now = new Date();
    const senderKey = generateKey(user.id, now);
    const receiverKey = generateKey(activeRoom.otherUser.id, now);
    const encrypted = encryptMessage(input.trim(), senderKey, receiverKey);

    wsRef.current?.send(
      JSON.stringify({
        type: "message",
        receiverId: activeRoom.otherUser.id,
        text: encrypted,
        createdAt: now.toISOString(),
      }),
    );
    setInput("");
  };

  const isMe = (senderId: string) => senderId === user?.id;
  const formatTime = (d: string | Date) =>
    new Date(d).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  const isOnline = (userId: string) => onlineUsers.has(userId);
  return (
    <div className="flex h-screen w-screen bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800 mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-8 py-2 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-slate-400" />
              </Button>
            )}
          </div>
        </div>

        {/* Search results */}
        {searchQuery.length >= 2 && (
          <div className="border-b border-slate-100">
            <p className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {searching ? "Searching..." : "People"}
            </p>
            {searchResults.length === 0 && !searching && (
              <p className="px-4 pb-3 text-sm text-slate-400">No users found</p>
            )}
            {searchResults.map((u) => (
              <div
                key={u.id}
                onClick={() => joinRoom(u)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition"
              >
                <Avatar name={u.name} size="sm" online={isOnline(u.id)} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Search for someone to start chatting</p>
            </div>
          )}
          {rooms.map((room) => (
            <div
              key={room.roomId || room.otherUser.id}
              onClick={() => joinRoom(room.otherUser)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition border-l-2 ${
                activeRoom?.otherUser.id === room.otherUser.id
                  ? "bg-blue-50 border-blue-500"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <Avatar
                name={room.otherUser.name}
                online={isOnline(room.otherUser.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {room.otherUser.name}
                  </p>
                  {room.lastMessage && (
                    <span className="text-xs text-slate-400 shrink-0 ml-1">
                      {formatTime(room.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {/* ✅ decrypted last message preview */}
                <p className="text-xs text-slate-400 truncate">
                  {room.lastMessage
                    ? decryptLastMessage(
                        room.lastMessage,
                        room.memberOneId,
                        room.memberTwoId,
                      )
                    : "Say hello 👋"}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Current user */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <Avatar name={user?.name ?? "?"} size="sm" online={wsReady} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-slate-400">
                {wsReady ? "Online" : "Connecting..."}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Chat area ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeRoom ? (
          <>
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
              <Avatar
                name={activeRoom.otherUser.name}
                size="lg"
                online={isOnline(activeRoom.otherUser.id)}
              />
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {activeRoom.otherUser.name}
                </h2>
                <p className="text-sm text-slate-400">
                  {activeRoom.otherUser.email}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${isOnline(activeRoom.otherUser.id) ? "bg-emerald-400" : "bg-slate-300"}`}
                />
                <span className="text-xs text-slate-400">
                  {isOnline(activeRoom.otherUser.id) ? "Online" : "Offline"}
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Avatar name={activeRoom.otherUser.name} size="lg" />
                  <p className="font-medium text-slate-600">
                    {activeRoom.otherUser.name}
                  </p>
                  <p className="text-sm">No messages yet. Say something!</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 items-end ${isMe(msg.senderId) ? "flex-row-reverse" : "flex-row"}`}
                >
                  {!isMe(msg.senderId) && (
                    <Avatar
                      name={msg.senderName || activeRoom.otherUser.name}
                      size="sm"
                    />
                  )}
                  <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe(msg.senderId)
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <p
                      className={`text-xs text-slate-400 mt-1 ${isMe(msg.senderId) ? "text-right" : "text-left"}`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="bg-white border-t border-slate-200 p-4 shrink-0">
              <form
                className="flex items-center gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <Input
                  className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  placeholder={`Message ${activeRoom.otherUser.name}...`}
                  value={input}
                  autoFocus
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!wsReady}
                />
                <button
                  type="submit"
                  disabled={!wsReady || !input.trim()}
                  className="w-11 h-11 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Send className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-600">
              Your Messages
            </p>
            <p className="text-sm">
              Pick a conversation or search for someone new
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Chat;
