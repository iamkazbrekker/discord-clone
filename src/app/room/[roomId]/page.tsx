"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

// ─── Types ──────────────────────────────────────────
interface ChatMessage {
    sender: string;
    text: string;
    timestamp: string;
    type: "message" | "system";
}

interface WSMessage {
    type: "message" | "system" | "history" | "error" | "room_update";
    sender?: string;
    text?: string;
    timestamp?: string;
    roomId?: string;
    messages?: Array<{ sender: string; text: string; timestamp: string }>;
    connected?: string[];
}

function Page() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;

    const { isLoaded, isSignedIn, user } = useUser();
    const [username, setUsername] = useState("Anonymous");

    const [copyStatus, setCopyStatus] = useState("Copy");
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState<string[]>([]);
    const [wsStatus, setWsStatus] = useState<
        "connecting" | "connected" | "disconnected" | "error"
    >("connecting");

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── Resolve username from Clerk ───────────────────
    useEffect(() => {
        if (isLoaded && isSignedIn && user?.username) {
            setUsername(user.username);
        }
    }, [isLoaded, isSignedIn, user]);

    // ── Auto-scroll to bottom ─────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── WebSocket Connection ──────────────────────────
    const connectWebSocket = useCallback(() => {
        if (!username || username === "Anonymous" || username === "Loading...") return;

        const ws = new WebSocket("ws://localhost:3001");
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("[WS] Connected");
            setWsStatus("connected");

            // Join the room
            ws.send(
                JSON.stringify({
                    type: "join",
                    roomId,
                    username,
                })
            );
        };

        ws.onmessage = (event) => {
            try {
                const data: WSMessage = JSON.parse(event.data);

                switch (data.type) {
                    case "history":
                        if (data.messages) {
                            setMessages(
                                data.messages.map((m) => ({
                                    sender: m.sender,
                                    text: m.text,
                                    timestamp: m.timestamp,
                                    type: "message" as const,
                                }))
                            );
                        }
                        break;

                    case "message":
                        setMessages((prev) => [
                            ...prev,
                            {
                                sender: data.sender || "Unknown",
                                text: data.text || "",
                                timestamp: data.timestamp || new Date().toISOString(),
                                type: "message",
                            },
                        ]);
                        break;

                    case "system":
                        setMessages((prev) => [
                            ...prev,
                            {
                                sender: "SYSTEM",
                                text: data.text || "",
                                timestamp: data.timestamp || new Date().toISOString(),
                                type: "system",
                            },
                        ]);
                        break;

                    case "room_update":
                        if (data.connected) {
                            setConnected(data.connected);
                        }
                        break;

                    case "error":
                        console.error("[WS] Error:", data.text);
                        setMessages((prev) => [
                            ...prev,
                            {
                                sender: "ERROR",
                                text: data.text || "Unknown error",
                                timestamp: new Date().toISOString(),
                                type: "system",
                            },
                        ]);
                        break;
                }
            } catch (err) {
                console.error("[WS] Failed to parse message:", err);
            }
        };

        ws.onclose = () => {
            console.log("[WS] Disconnected");
            setWsStatus("disconnected");

            // Attempt reconnection after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log("[WS] Attempting reconnection...");
                setWsStatus("connecting");
                connectWebSocket();
            }, 3000);
        };

        ws.onerror = (err) => {
            console.error("[WS] Error:", err);
            setWsStatus("error");
        };
    }, [roomId, username]);

    // ── Connect on mount ──────────────────────────────
    useEffect(() => {
        if (username && username !== "Anonymous" && username !== "Loading...") {
            connectWebSocket();
        }

        return () => {
            // Cleanup on unmount
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket, username]);

    // ── Send Message ─────────────────────────────────
    const sendMessage = () => {
        if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        wsRef.current.send(
            JSON.stringify({
                type: "message",
                roomId,
                username,
                text: input.trim(),
            })
        );

        setInput("");
        inputRef.current?.focus();
    };

    // ── Copy Room Link ────────────────────────────────
    const copyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopyStatus("Copied!");
        setTimeout(() => setCopyStatus("Copy"), 2000);
    };

    // ── Format Timestamp ──────────────────────────────
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // ── Status Indicator Color ────────────────────────
    const statusColor = {
        connecting: "text-yellow-500",
        connected: "text-green-500",
        disconnected: "text-red-500",
        error: "text-red-500",
    };

    const statusDot = {
        connecting: "bg-yellow-500",
        connected: "bg-green-500",
        disconnected: "bg-red-500",
        error: "bg-red-500",
    };

    return (
        <main className="flex flex-col h-screen overflow-hidden">
            {/* ── Header ─────────────────────────────────── */}
            <header className="border-b border-zinc-800 p-4 flex items-center justify-between bg-zinc-900/30">
                <div className="flex flex-col">
                    <span className="text-xs text-zinc-500">ROOM ID</span>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-green-500">{roomId}</span>
                        <button
                            onClick={copyLink}
                            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            {copyStatus}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Connected Users */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">CONNECTED</span>
                        <div className="flex items-center gap-1">
                            {connected.map((u, i) => (
                                <span
                                    key={i}
                                    className={`text-xs px-2 py-0.5 rounded ${u === username
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                        }`}
                                >
                                    {u}
                                </span>
                            ))}
                            {connected.length === 0 && (
                                <span className="text-xs text-zinc-600">—</span>
                            )}
                        </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-1.5">
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${statusDot[wsStatus]} ${wsStatus === "connecting" ? "animate-pulse" : ""
                                }`}
                        ></div>
                        <span className={`text-[10px] uppercase font-mono ${statusColor[wsStatus]}`}>
                            {wsStatus}
                        </span>
                    </div>

                    {/* Back Button */}
                    <button
                        onClick={() => router.push("/")}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        ← BACK
                    </button>
                </div>
            </header>

            {/* ── Messages Area ──────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                            <p className="text-zinc-600 text-sm font-mono">
                                {">"} waiting for messages...
                            </p>
                            <p className="text-zinc-700 text-xs">
                                Share the Room ID with someone to start chatting
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <div key={index} className="group">
                        {msg.type === "system" ? (
                            /* System Message */
                            <div className="flex items-center gap-2 py-1">
                                <span className="text-zinc-700 text-[10px] font-mono">
                                    {formatTime(msg.timestamp)}
                                </span>
                                <span className="text-zinc-600 text-xs italic">
                                    *** {msg.text}
                                </span>
                            </div>
                        ) : (
                            /* User Message */
                            <div className="flex items-start gap-2 py-0.5 hover:bg-zinc-900/30 px-2 -mx-2 rounded transition-colors">
                                <span className="text-zinc-700 text-[10px] font-mono shrink-0 pt-0.5">
                                    {formatTime(msg.timestamp)}
                                </span>
                                <span
                                    className={`text-sm font-bold shrink-0 ${msg.sender === username
                                            ? "text-green-500"
                                            : "text-blue-400"
                                        }`}
                                >
                                    {msg.sender}:
                                </span>
                                <span className="text-zinc-300 text-sm break-all">
                                    {msg.text}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input Area ─────────────────────────────── */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                <div className="flex gap-4">
                    <div className="flex-1 relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 animate-pulse">
                            {">"}
                        </span>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") sendMessage();
                            }}
                            disabled={wsStatus !== "connected"}
                            className="w-full bg-black border border-zinc-800 focus:border-green-500/50 focus:outline-none transition-colors text-zinc-100 placeholder:text-zinc-700 py-3 pl-8 pr-4 text-sm disabled:opacity-50"
                            type="text"
                            placeholder={
                                wsStatus === "connected"
                                    ? "Type a message..."
                                    : "Connecting..."
                            }
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || wsStatus !== "connected"}
                        className="bg-zinc-800 text-zinc-400 px-6 text-sm font-bold hover:text-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        SEND
                    </button>
                </div>
            </div>
        </main>
    );
}

export default Page;