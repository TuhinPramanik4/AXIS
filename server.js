import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import bodyParser from 'body-parser';
import User from "./Models/User.js";  


const app = express();


app.use('/Public', express.static(path.join(process.cwd(), 'Public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

mongoose.connect("mongo db url", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.get("/",(req,res)=>{
    res.render("FirstLayout");
})

// Route for Landing Page
app.get("/Dashboard", (req, res) => {
    res.render("LandingPage");
});

app.get("/Sign-in",(req,res)=>{
    res.render("SignIN");
})
app.post("/Sign-in", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send("User not found");
        }

        // Check if password matches (No Hashing as per your request)
        if (user.password !== password) {
            return res.status(401).send("Incorrect password");
        }

        res.redirect("/Dashboard");
    } catch (error) {
        res.status(500).send("Server error");
    }
});
//Get and post request for Sign up
app.get("/Sign-Up",(req,res)=>{
    res.render("SignUp");
})
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

app.get("/profile", (req, res) => {
    res.render('Profile');
});

app.get("/practice-Breathing",(req,res)=>{
    res.render("Breathing");
})

app.get("/Tiutorials",(req,res)=>{
    res.render("Tiutorials");
})

app.get("/Chat",(req,res)=>{
    res.render("Chat")
})

app.get("/yoga",(req,res)=>{
    res.render("Yoga")
})

app.get("/test",(req,res)=>{
    res.render("Test")
})



app.listen(8000, () => {
    console.log("Server started on http://localhost:8000");
});
