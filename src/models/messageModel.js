import mongoose from "mongoose"
import { maxLength } from "zod"

const messageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: [true, "roomID is required"],
        index: true
    },
    sender: {
        type: String,
        required: [true, 'Sender is required']
    },
    text: {
        type: String,
        required: [true, "Message is required"],
        maxLength: [2000, "message cannot be longer than 2000 characters"]
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
})

messageSchema.index({ roomId: 1, timestamp: 1 })

delete mongoose.models.Messages;
const Message = mongoose.model("Messages", messageSchema)
export default Message