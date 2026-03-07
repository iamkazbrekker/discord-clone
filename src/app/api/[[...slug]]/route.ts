import { connect } from '@/dbConfig/dbConfig';
import Room from '@/models/roomCreated'
import Message from '@/models/messageModel'
import { currentUser } from '@clerk/nextjs/server';
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'



const room = new Elysia({ prefix: "/room" })
    .post("/", async ({ body, set }: any) => {
        try {
            await connect();
            console.log("[API] /api/room POST request body:", body);
            const user = await currentUser();
            const username = body?.username || user?.username || 'anonymous';
            const roomId = nanoid(8);

            console.log("[API] Connecting to DB and saving room for user:", username);
            const newRoom = new Room({
                username,
                roomId,
                connected: [username]
            })

            const savedRoom = await newRoom.save()
            console.log(`[API] Room created successfully:`, savedRoom.roomId)

            return {
                username: (savedRoom as any).username,
                roomId: (savedRoom as any).roomId
            };
        } catch (error: any) {
            console.error("[API] Error creating room:", error);
            set.status = 500;
            return { error: error.message || "Failed to create room" };
        }
    })
    .post("/join", async ({ body, set }: any) => {
        try {
            await connect();
            const user = await currentUser()
            const username = body?.username || user?.username || 'anonymous'
            const roomId = body?.roomId

            if (!roomId) {
                set.status = 400;
                return { error: "Room ID is required" }
            }

            const existingRoom = await Room.findOne({ roomId })
            if (!existingRoom) {
                set.status = 404;
                return { error: "Room not found" }
            }

            if (existingRoom.connected.length >= 2) {
                set.status = 403;
                return { error: "Max 2 participants" }
            }

            if (existingRoom.connected.includes(username)) {
                return {
                    message: "Already in room",
                    roomId: existingRoom.roomId,
                    connected: existingRoom.connected
                }
            }

            existingRoom.connected.push(username)
            await existingRoom.save()

            console.log(`User ${username} joined room ${roomId}`)

            return {
                message: "Joined successfully",
                roomId: existingRoom.roomId,
                connected: existingRoom.connected
            }
        } catch (error: any) {
            console.error("[API] Error joining room:", error);
            set.status = 500;
            return { error: error.message || "Failed to join room" };
        }
    })
    .get("/:roomId", async ({ params, set }: any) => {
        try {
            await connect();
            const { roomId } = params
            const existingRoom = await Room.findOne({ roomId })

            if (!existingRoom) {
                set.status = 404;
                return { error: "Room does not exist" }
            }

            return {
                roomId: existingRoom.roomId,
                username: existingRoom.username,
                connected: existingRoom.connected,
                isFull: existingRoom.isFull,
                createdAt: existingRoom.createdAt
            }
        } catch (error: any) {
            console.error("[API] Error getting room:", error);
            set.status = 500;
            return { error: error.message || "Failed to get room" };
        }
    })

const messages = new Elysia({ prefix: "/messages" })
    .get("/:roomId", async ({ params, set }: any) => {
        try {
            await connect();
            const { roomId } = params
            const roomMessages = await Message.find({ roomId })
                .sort({ timestamp: 1 })
                .limit(200)
                .lean()

            return {
                messages: roomMessages
            }
        } catch (error: any) {
            console.error("[API] Error getting messages:", error);
            set.status = 500;
            return { error: error.message || "Failed to get messages" };
        }
    })

const app = new Elysia({ prefix: '/api' })
    .use(room)
    .use(messages)

export const GET = app.fetch
export const POST = app.fetch

export type App = typeof app