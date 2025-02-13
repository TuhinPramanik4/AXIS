import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import User from "./Models/User.js";   

const app = express();
const SECRET_KEY = " "; // Change this to a secure key

app.use('/Public', express.static(path.join(process.cwd(), 'Public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

mongoose.connect(" ", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

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

// Profile route (Protected)
app.get("/profile", authenticateToken, (req, res) => {
    res.render("Profile", { user: req.user });
});


// Logout Route
app.get("/logout", (req, res) => {
    res.clearCookie("jwt");
    res.redirect("/Sign-in");
});

app.listen(8000, () => {
    console.log("Server started on http://localhost:8000");
});
