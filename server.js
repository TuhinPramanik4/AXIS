import express from 'express';
import http from  'http';
import mongoose from 'mongoose';
import path from 'path';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { Server } from "socket.io";
import cors from 'cors';
import User from "./Models/User.js";   
import dotenv from 'dotenv';
import {GoogleGenerativeAI} from '@google/generative-ai'
dotenv.config();

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
const SECRET_KEY =  process.env.JWT_SECRET; // Change this to a secure key

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI("AIzaSyAbM5rRYFkNq5H0ivMSpIvjlXeVOAK6uU8");
const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"})
const questions = [
    { category: "Physical Health", text: "How have your sleeping habits been over the past 6 months?", options: ["I sleep well and feel rested.", "I have some trouble sleeping but manage.", "I frequently have difficulty sleeping or feel restless.", "I struggle significantly with sleep and feel constantly tired."] },
    { category: "Physical Health", text: "How would you describe your appetite over the past 6 weeks?", options: ["My appetite is stable and normal.", "I eat slightly more or less than usual.", "I have noticed significant changes in my eating habits.", "I have a major decrease or increase in appetite affecting my health."] },
    { category: "Well-being", text: "How often have you experienced low feelings, stress, or sadness in the past few months?", options: ["Rarely or never.", "Occasionally, but I can manage.", "Frequently, and it affects my mood.", "Almost all the time, and it severely impacts my life."] },
    { category: "Well-being", text: "How frequently have you lost pleasure or interest in activities you usually enjoy?", options: ["Not at all, I enjoy my usual activities.", "Sometimes, but I can still engage in them.", "Often, and I struggle to enjoy things.", "Almost always, I find little or no joy in anything."] },
    { category: "Autonomy", text: "How often do you feel like your moods or life are under your control?", options: ["Almost always, I feel in control.", "Often, but I sometimes struggle.", "Rarely, I feel like I have little control.", "Never, I feel completely out of control."] },
    { category: "Autonomy", text: "How frequently have you been unable to stop worrying?", options: ["Rarely, I manage my worries well.", "Sometimes, but it doesn’t interfere much.", "Often, and it affects my daily life.", "Almost all the time, and it feels overwhelming."] },
    { category: "Self-Perception", text: "How confident have you been feeling in your capabilities recently?", options: ["Very confident, I trust my abilities.", "Somewhat confident, but I have doubts.", "Often unsure of my abilities.", "I lack confidence and doubt myself constantly."] },
    { category: "Self-Perception", text: "How often have you felt satisfied with yourself over the past few months?", options: ["Almost always, I feel good about myself.", "Often, but I have some moments of doubt.", "Rarely, I struggle with self-satisfaction.", "Never, I feel deeply unsatisfied with myself."] },
];


app.use('/Public', express.static(path.join(process.cwd(), 'Public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

  const MessageSchema = new mongoose.Schema({
    content: String,
    timestamp: { type: Date, default: Date.now },
});
const EmotionSchema = new mongoose.Schema({
    emotion: String,
    note: String,
    timestamp: { type: Date, default: Date.now }
});
const Emotion = mongoose.model("Emotion", EmotionSchema);
const Message = mongoose.model("Message", MessageSchema);

app.post("/submit", async (req, res) => {
    const { emotion, note } = req.body;
    await Emotion.create({ emotion, note });
    res.redirect("/Dashboard");
});

app.get("/data", async (req, res) => {
    const emotions = await Emotion.find().sort({ timestamp: -1 });
    res.render("data", { emotions });
});
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

// Middleware to verify JWT
async function authenticateToken(req, res, next) {
    const token = req.cookies.jwt;
    if (!token) return res.redirect('/Sign-in');

    jwt.verify(token, SECRET_KEY, async (err, decoded) => {
        if (err) return res.status(403).send("Invalid token");

        try {
            const user = await User.findById(decoded.id).select("-password"); // Exclude password for security
            if (!user) return res.redirect('/Sign-in');

            req.user = user; // Attach full user data
            next();
        } catch (error) {
            res.status(500).send("Server error");
        }
    });
}


app.get("/", (req, res) => {
    res.render("FirstLayout");
});

// Landing Page (Protected Route)
app.get("/Dashboard", authenticateToken, (req, res) => {
    res.render("LandingPage", { user: req.user });
});


app.get("/Sign-in", (req, res) => {
    res.render("SignIN");
});

app.post("/Sign-in", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).send("User not found");

        if (user.password !== password) return res.status(401).send("Incorrect password");

        const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });
        res.cookie("jwt", token, { httpOnly: true, secure: true });
        res.redirect("/Dashboard");
    } catch (error) {
        res.status(500).send("Server error");
    }
});

app.post("/send", async (req, res) => {
    try {
        const que = req.body.question;
        if (!que) return res.status(400).json({ error: "Question is required" });

        console.log("Received question:", que);

        const prompt = `${que} recommend only one excerize name , nothing more`;
        const responseByAI = await model.generateContent(prompt);

        console.log("AI Raw Response:", JSON.stringify(responseByAI, null, 2));

        const ans = responseByAI.response.text();

        return res.json({ answer: ans });
    } catch (err) {
        console.error("❌ Error in /send route:", err); // More detailed error
        res.status(500).json({ error: "Failed to process request" });
    }
});


app.get("/Sign-Up", (req, res) => {
    res.render("SignUp");
});

app.post("/Sign-Up", async (req, res) => {
    try {
        const { username, password, age, location, gender, phoneNumber, email } = req.body;
        const newUser = new User({ username, password, age, location, gender, phoneNumber, email });
        await newUser.save();
        res.status(201).redirect("/Sign-in");
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});



app.get("/test",(req,res)=>{
    res.render("Test",{questions});
})
app.post("/submit-test", authenticateToken, async (req, res) => {
    let score = 0;

    questions.forEach((q, index) => {
        const answer = req.body[`q${index}`];

        if (answer) {
            const optionIndex = q.options.indexOf(answer);
            if (optionIndex !== -1) {
                score += optionIndex + 1; // Assign scores: 1 for best state, 4 for worst
            }
        }
    });

    let mentalState = "";
    if (score <= 10) {
        mentalState = "Excellent Mental Health";
    } else if (score <= 18) {
        mentalState = "Good Mental Health";
    } else if (score <= 26) {
        mentalState = "Moderate Mental Health - Consider Taking Some Care";
    } else {
        mentalState = "Poor Mental Health - Seeking Help is Recommended";
    }

    try {
        await User.findByIdAndUpdate(req.user._id, { mentalstate: mentalState });
        res.render("result", { score, mentalState });
    } catch (error) {
        res.status(500).send("Error updating mental state");
    }
});


// Profile route (Protected)
app.get("/profile", authenticateToken, async (req, res) => {
    try {
        // Fetch emotions from the database for the current user
        const emotions = await Emotion.find().sort({ timestamp: -1 });

        // Render Profile page with emotions data
        res.render("Profile", {
            user: req.user,
            emotions: emotions,  // Ensure you're passing the correct variable
            mentalState: req.user.mentalstate || "Not Evaluated"
        });
    } catch (error) {
        console.error("Error fetching emotions:", error);
        res.status(500).send("Error loading profile data.");
    }
});



app.get("/chat",(req,res)=>{
    res.render("Chat")
})
app.get("/practice-Breathing",(req,res)=>{
    res.render("Breathing")
})

app.get("/Tiutorials",(req,res)=>{
    res.render("Tiutorials")
})
app.get("/yoga",(req,res)=>{
    res.render("Yoga");
})
// Logout Route
app.get("/logout", (req, res) => {
    res.clearCookie("jwt");
    res.redirect("/");
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
