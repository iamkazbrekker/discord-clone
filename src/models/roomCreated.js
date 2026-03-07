import mongoose from "mongoose"

const roomSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'username required']
    },
    roomId: {
        type: String,
        required: [true, 'please provide roomId'],
        unique: true
    },
    connected: {
        type: [String],
        required: true,
        validate: {
            validator: function (v) {
                return v.length <= 2;
            },
            message: "Room cannot have more than 2 participants"
        }
    },
    isFull: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

roomSchema.pre('save', function () {
    this.isFull = this.connected.length >= 2;
})

delete mongoose.models.Rooms;
const Room = mongoose.model("Rooms", roomSchema);

export default Room