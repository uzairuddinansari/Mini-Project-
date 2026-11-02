const express = require('express')
const app = express()
const cookieParser = require("cookie-parser");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const path = require('path')
const myPlaintextPassword = 'uzair';
const usermodel = require("./db/models/user");
const adminmodel = require("./db/models/admin");
const signupSchema = require("./db/models/signup");
// const dmin = require("./db/models/defaultAdmin");
const { validateHeaderValue } = require('http');
const { render } = require('ejs');
const jwt = require('jsonwebtoken');
require("dotenv").config();
const dns = require('dns')

dns.setServers(['8.8.8.8', '8.8.4.4'])

app.set('view engine','ejs')                      
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));
// const someOtherPlaintextPassword = 'not_bacon';

app.use(cookieParser())
app.use(express.json())

app.get("/", (req, res) => {
    if (req.cookies.sign_token) {
        return res.redirect("/home");
    }

    return res.redirect("/login");
});

app.get("/home", async (req, res) => {
    try {
        let token = req.cookies.sign_token;

        if (!token) {
            return res.redirect("/login");
        }

        let Ans = jwt.verify(token, process.env.SING_UP);

        let user = await signupSchema.findOne({
            email: Ans.email
        });

        if (!user) {
            return res.redirect("/login");
        }

        return res.render("index", { user });

    } catch (err) {
        return res.redirect("/login");
    }
});

app.get("/login",(req,res)=>{
    res.render("login")
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        let emailData = await signupSchema.findOne({ email });

        if (!emailData) {
            return res.send("Your Credentials Are Wrong");
        }

        let comparing = await bcrypt.compare(password, emailData.password);

        if (!comparing) {
            return res.send("Wrong Password");
        }

        let token = jwt.sign(
            { email: emailData.email },
            process.env.SING_UP
        );

        res.cookie("sign_token", token, {
         httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.cookie("sign_token", token);

        return res.redirect(`/home`);

    } catch (err) {
        console.log(err);
        return res.send("Invalid Credentials");
    }
});

app.post("/signup", async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.send("Password Does Not Match");
        }

        let hash = await bcrypt.hash(password, saltRounds);

        await signupSchema.create({
            username,
            email,
            password: hash
        });

        return res.redirect("/login");

    } catch (err) {
        console.log(err);
        return res.send("Signup Failed");
    }
});
     
app.get("/admin/pro",(req,res)=>{
    res.render("pro")
})

app.get("/add/admin", (req, res) => {
    res.render("addadmin")
})

app.post("/add/admin", async (req, res) => {

    const { username, email, password } = req.body;
    
});

app.listen(3000,() => {
    console.log("server is running on port 3000")
})