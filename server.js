import express from 'express'
import path from 'path'
const app = express()

app.use('/Public', express.static('/Public'));


app.set("view engine","ejs");
app.set("views",path.join(process.cwd(),"views"));

app.get("/",(req,res)=>{
    res.render("LandingPage");
})

app.listen(8000,()=>{
    console.log("Server Started");
})