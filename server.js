require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

// Initialize Express App
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }, // Allow cross-origin requests
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB connection error:", err));

// Message Schema
const MessageSchema = new mongoose.Schema({
    content: String,
    timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", MessageSchema);

// REST API Routes
// Get messages (with proper error handling)
app.get("/messages", async (req, res) => {
    console.log("GET /messages route hit");
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50); // Retrieve latest 50 messages
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Post message route
app.post("/messages", async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || content.trim() === "") {
            return res.status(400).json({ error: "Message content is required" });
        }

        const message = new Message({ content });
        await message.save();
        io.emit("newMessage", message); // Emit to all connected clients in real-time
        res.status(201).json(message);
    } catch (error) {
        console.log("Error posting message:", error);
        res.status(500).json({ error: "Failed to post message" });
    }
});

// WebSockets (Real-time chat)
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle sending of messages from client
    socket.on("sendMessage", async (data) => {
        try {
            if (!data || data.trim() === "") {
                socket.emit("error", "Message content cannot be empty.");
                return;
            }

            const message = new Message({ content: data });
            await message.save();
            io.emit("newMessage", message); // Broadcast message to all connected clients
        } catch (error) {
            console.log("Error handling WebSocket message:", error);
            socket.emit("error", "Failed to send message.");
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
