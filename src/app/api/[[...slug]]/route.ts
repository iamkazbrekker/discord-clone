import { connect } from '@/dbConfig/dbConfig';
import Room from '@/models/roomCreated'
import { currentUser } from '@clerk/nextjs/server';
import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'

connect()


const room = new Elysia({ prefix: "/room" }).post("/", async ({ body }: any) => {
    const user = await currentUser();
    const username = body?.username || user?.username || 'anonymous';
    const roomId = nanoid(8);
    const newRoom = new Room({
        username,
        roomId
    })

    const savedRoom = await newRoom.save()
    console.log(`Room created: ${savedRoom}`)

    return savedRoom;
})

const app = new Elysia({ prefix: '/api' })
    .use(room)

export const GET = app.fetch
export const POST = app.fetch

export type App = typeof app