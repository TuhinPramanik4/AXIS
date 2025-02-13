import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';

const app = express();


app.use('/Public', express.static(path.join(process.cwd(), 'Public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

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

app.get("/Sign-Up",(req,res)=>{
    res.render("SignUp");
})
// Route for Profile Page
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
