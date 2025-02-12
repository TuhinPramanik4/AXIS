import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';

const app = express();


app.use('/Public', express.static(path.join(process.cwd(), 'Public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

// Route for Landing Page
app.get("/", (req, res) => {
    res.render("LandingPage");
});

// Route for Profile Page
app.get("/profile", (req, res) => {
    res.render('Profile');
});

app.listen(8000, () => {
    console.log("Server started on http://localhost:8000");
});
