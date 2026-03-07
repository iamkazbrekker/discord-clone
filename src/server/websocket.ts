import { WebSocketServer, WebSocket } from "ws";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
    if (!MONGO_URI) {
        console.error("[WS Server] Error: MONGO_URI is not defined in environment variables");
        return;
    }
    if (mongoose.connection.readyState === 0) {
        try {
            await mongoose.connect(MONGO_URI);
            console.log("[WS Server] MongoDB connected")
        } catch (err) {
            console.error("[WS Server] MongoDB connection error:", err);
        }
    }
}

const messageSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    text: { type: String, required: true, maxlength: 2000 },
    timestamp: { type: Date, default: Date.now },
});
messageSchema.index({ roomId: 1, timestamp: 1 });

const Message = mongoose.models.Messages || mongoose.model("Messages", messageSchema);

interface RoomClient {
    ws: WebSocket;
    username: string;
}
interface incomingMessage {
    type: "join" | "message" | "leave";
    roomId: string;
    username: string;
    text?: string;
}
interface outgoingMessage {
    type: "message" | "system" | "history" | "error" | "room_update";
    roomId?: string;
    sender?: string;
    text?: string;
    timestamp?: string;
    messages?: Array<{
        sender: string;
        text: string;
        timetsamp: string;
    }>;
    connected?: string[];
}

const rooms = new Map<string, RoomClient[]>();

function broadcastToRoom(roomId: string, message: outgoingMessage, excludeWs?: WebSocket) {
    const clients = rooms.get(roomId) || [];
    const data = JSON.stringify(message);
    for (const client of clients) {
        if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    }
}

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`[WS Server] running on port ${PORT}`);

connectDB().catch(console.error)

wss.on("connection", (ws: WebSocket) => {
    let currentRoom: string | null = null;
    let currentUsername: string | null = null

    console.log("[WS Server] New cient connected");

    ws.on("message", async (raw: Buffer) => {
        try {
            const data: incomingMessage = JSON.parse(raw.toString());

            switch (data.type) {
                case "join": {
                    const { roomId, username } = data;
                    if (!roomId || !username) {
                        ws.send(JSON.stringify({
                            type: "error",
                            text: "roomId and username required"
                        }))
                        return
                    }

                    if (!rooms.has(roomId)) {
                        rooms.set(roomId, [])
                    }

                    const roomClients = rooms.get(roomId)!

                    const alreadyIn = roomClients.find(
                        (c) => c.username === username
                    )
                    if (alreadyIn) {
                        alreadyIn.ws = ws
                    } else {
                        roomClients.push({ ws, username })
                    }

                    currentRoom = roomId
                    currentUsername = username

                    const history = await Message.find({ roomId })
                        .sort({ timestamp: 1 })
                        .limit(100)
                        .lean()

                    ws.send(JSON.stringify({
                        type: "history",
                        roomId,
                        messages: history.map((m: any) => ({
                            sender: m.sender,
                            text: m.text,
                            timmestamp: m.timestamp.toISOString()
                        }))
                    }))

                    broadcastToRoom(roomId, {
                        type: "room_update",
                        roomId,
                        connected: roomClients.map((c) => c.username)
                    })

                    console.log(`[WS server] ${username} joined room ${roomId}`)
                    break
                }

                case "message": {
                    const { roomId, username, text } = data;

                    if (!roomId || !username || !text) {
                        ws.send(JSON.stringify({
                            type: "error",
                            text: "roomId, username, and text required"
                        }))
                        return
                    }

                    const newMessage = new Message({
                        roomId,
                        sender: username,
                        text,
                        timestamp: new Date()
                    })
                    await newMessage.save()

                    const outgoing: outgoingMessage = {
                        type: "message",
                        roomId,
                        sender: username,
                        text,
                        timestamp: newMessage.timestamp.toISOString()
                    }

                    const allClients = rooms.get(roomId) || []
                    const broadcastData = JSON.stringify(outgoing)
                    for (const client of allClients) {
                        if (client.ws.readyState === WebSocket.OPEN) {
                            client.ws.send(broadcastData)
                        }
                    }

                    console.log(`[WS Server] [${roomId}] ${username}: ${text}`)
                    break
                }

                case "leave": {
                    handleDisconnect()
                    break
                }
            }
        } catch (err) {
            console.log("[WS Server] Error processing message: ", err)
            ws.send(JSON.stringify({
                type: "error",
                text: "Failed to process message"
            }))
        }
    })

    function handleDisconnect() {
        if (currentRoom && currentUsername) {
            const roomClients = rooms.get(currentRoom)
            if (roomClients) {
                const index = roomClients.findIndex(
                    (c) => c.username === currentUsername
                )
                if (index !== -1) {
                    roomClients.splice(index, 1)
                }

                broadcastToRoom(currentRoom, {
                    type: "system",
                    text: `${currentUsername} left the room`,
                    timestamp: new Date().toISOString()
                })
                broadcastToRoom(currentRoom, {
                    type: "room_update",
                    roomId: currentRoom,
                    connected: roomClients.map((c) => c.username)
                })

                if (roomClients.length === 0) {
                    rooms.delete(currentRoom)
                }
            }
            console.log(`[WS Server] ${currentUsername} left room ${currentRoom}`)
        }
    }

    ws.on("error", (err) => {
        console.log("[WS Server] WebSocket error: ", err)
        handleDisconnect()
    })
})