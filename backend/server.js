const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", 
        methods: ["GET", "POST"],
    },
});

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));


const Message = mongoose.model('Message', new mongoose.Schema({
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
}));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    // Handle sending messages
    // socket.on('sendMessage', async (data) => {
    //     const { room, sender, content } = data;

    //     // Save message to MongoDB
    //     const message = new Message({ sender, content });
    //     await message.save();

    //     // Broadcast message to the specific room
    //     io.to(room).emit('receiveMessage', { sender, content });
    //     console.log(`Message sent to room ${room}: ${sender}: ${content}`);
    // });

socket.on('sendMessage', async (data) => {
    const { room, sender, content } = data;

    const message = new Message({ sender, content });
    await message.save();

    io.to(room).emit('receiveMessage', { sender, content });
    console.log(`Message sent to room ${room}: ${sender}: ${content}`);
});


socket.on('joinRoom', async (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);

  
    const messages = await Message.find({ room }).sort({ timestamp: 1 });

    socket.emit('chatHistory', messages);
});

  
    socket.on('typing', (data) => {
        socket.to(data.room).emit('userTyping', { username: data.username });
    });

    socket.on('stopTyping', (room) => {
        socket.to(room).emit('userStoppedTyping');
    });

  
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
