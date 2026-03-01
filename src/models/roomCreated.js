import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'username required']
    },
    roomId: {
        type: String,
        required: [true, 'please provide roomId']
    }
})

const Room = mongoose.models.Rooms || mongoose.model("Rooms", roomSchema)

export default Room