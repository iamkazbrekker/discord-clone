import mongoose from 'mongoose'

export async function connect() {
    if (mongoose.connection.readyState >= 1) return;
    try {
        await mongoose.connect(process.env.MONGO_URI!)
        const connection = mongoose.connection

        connection.on('connected', () => {
            console.log('MongoDB connected successfully')
        })

        connection.on('error', (err) => {
            console.error('MongoDB connection error: ' + err)
        })
    } catch (error) {
        console.error('Something has gone wrong during MongoDB connection')
        console.error(error)
    }
}