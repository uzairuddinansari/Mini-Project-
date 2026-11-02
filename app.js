const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const signupSchema = require("./db/models/signup");
const pro = require("./db/models/pro");
const payment  = require("./db/models/payment");

app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// Login token se current user find karne ka function
async function getLoggedInUser(req) {
    try {
        const token = req.cookies.sign_token;

        if (!token) return null;

        const decoded = jwt.verify(token, process.env.SING_UP);

        return await signupSchema.findOne({
            email: decoded.email
        });
    } catch (err) {
        return null;
    }
}

// Home
app.get("/", (req, res) => {
    return res.redirect("/home");
});

app.get("/home", async (req, res) => {
    const user = await getLoggedInUser(req);

    if (!user) return res.redirect("/login");

    return res.render("index", { user });
});

// Login page
app.get("/login", (req, res) => {
    res.render("login");
}); 
app.get("/signup",(req,res)=>{
    res.render("signup")
})

// Signup
app.post("/signup", async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.send("Password Does Not Match");
        }

        const hash = await bcrypt.hash(password, saltRounds);

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

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const emailData = await signupSchema.findOne({ email });

        if (!emailData) {
            return res.send("Your Credentials Are Wrong");
        }

        const comparing = await bcrypt.compare(
            password,
            emailData.password
        );

        if (!comparing) {
            return res.send("Wrong Password");
        }

        const token = jwt.sign(
            { email: emailData.email },
            process.env.SING_UP,
            { expiresIn: "7d" }
        );

        res.cookie("sign_token", token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: "lax"
        });

        return res.redirect("/home");

    } catch (err) {
        console.log(err);
        return res.send("Invalid Credentials");
    }
});

app.get("/pro",(req,res)=>{
    res.render("pro")
})

// Pro button ka route
app.get("/admin/pro", async (req, res) => {
    const user = await getLoggedInUser(req);

    if (!user) return res.redirect("/login");

    // Already Pro hai?
    if (user.plan === "pro") {
        return res.redirect("/pro");
    }

    // Pro form mein logged-in user ki details bhejo
    return res.render("pro-form", { user });
});

// Pro application + OTP
app.post("/pro/upgrade", async (req, res) => {
    const user = await getLoggedInUser(req);

    if (!user) return res.redirect("/login");

    try {
        // Pehle dobara Pro status check karo
        if (user.plan === "pro") {
            return res.redirect("/home");
        }

        const {
            fullName,
            phone,
            country,
            plan,
            paymentMethod
        } = req.body;

        const OTP = crypto.randomInt(100000, 1000000).toString();

        // Login wali email use hogi, form wali email nahi
        const ProUser = await pro.findOneAndUpdate(
            { email: user.email },
            {
                fullName,
                email: user.email,
                phone,
                country,
                plan,
                paymentMethod,
                otp: OTP,
                otpExpires: new Date(Date.now() + 2 * 60 * 1000),
                isVerified: false
            },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        const PRO_TOKEN = jwt.sign(
            { email: ProUser.email },
            process.env.PRO_USER,
            { expiresIn: "10m" }
        );

        res.cookie("Pro_token", PRO_TOKEN, {
            httpOnly: true,
            maxAge: 10 * 60 * 1000,
            sameSite: "lax"
        });

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: "Your Pro Verification OTP",
            text: `Your OTP is ${OTP}. It expires in 2 minutes.`
        });

        return res.redirect("/OTP");

    } catch (err) {
        console.log(err);
        return res.send("Pro Upgrade Failed");
    }
});

// OTP page
app.get("/OTP", async (req, res) => {
    const user = await getLoggedInUser(req);

    if (!user) return res.redirect("/login");

    if (!req.cookies.Pro_token) {
        return res.redirect("/admin/pro");
    }

    return res.render("Otp");
});

// Verify OTP
app.post("/pro/verify-otp", async (req, res) => {
    const { otp } = req.body;

    try {
        const user = await getLoggedInUser(req);

        if (!user) return res.redirect("/login");

        const decoded = jwt.verify(
            req.cookies.Pro_token,
            process.env.PRO_USER
        );

        // Dono tokens ki email same honi chahiye
        if (decoded.email !== user.email) {
            return res.send("Account does not match!");
        }

        const ProUser = await pro.findOne({
            email: user.email
        });

        if (!ProUser) {
            return res.send("Pro Application Not Found!");
        }

        if (ProUser.otpExpires < new Date()) {
            await pro.findOneAndDelete({ email: user.email });
            res.clearCookie("Pro_token");

            return res.redirect("/admin/pro");
        }

        if (ProUser.otp !== otp) {
            return res.send("Incorrect OTP!");
        }

        ProUser.isVerified = true;
        ProUser.otp = undefined;
        ProUser.otpExpires = undefined;

        await ProUser.save();

        return res.redirect("/pro/checkout/mood");

    } catch (err) {
        console.log(err);
        return res.send("OTP Verification Failed!");
    }
});

// Demo payment page
app.get("/pro/checkout/mood", async (req, res) => {
    try {
        const user = await getLoggedInUser(req);

        if (!user) return res.redirect("/login");

        const decoded = jwt.verify(
            req.cookies.Pro_token,
            process.env.PRO_USER
        );

        if (decoded.email !== user.email) {
            return res.send("Account does not match!");
        }

        const ProUser = await pro.findOne({
            email: user.email,
            isVerified: true
        });

        if (!ProUser) {
            return res.redirect("/admin/pro");
        }

        return res.render("demo-payment");

    } catch (err) {
        return res.redirect("/admin/pro");
    }
});

// Demo payment submit
app.post("/pro/demo-payment", async (req, res) => {
    const { paymentMethod, accountNumber, transactionId } = req.body;

    try {
        // Logged-in user verify
        const user = await getLoggedInUser(req);

        if (!user) {
            return res.redirect("/login");
        }

        // Check Pro token
        const decoded = jwt.verify(
            req.cookies.Pro_token,
            process.env.PRO_USER
        );

        if (decoded.email !== user.email) {
            return res.send("Account does not match!");
        }

        // Check OTP verification
        const ProUser = await pro.findOne({
            email: user.email,
            isVerified: true
        });

        if (!ProUser) {
            return res.send("Please verify your OTP first!");
        }

        // Check payment details
        if (!paymentMethod || !accountNumber || !transactionId) {
            return res.send("Please fill all payment details!");
        }

        // Check duplicate transaction ID
        const existingPayment = await payment.findOne({
            transactionId
        });

        if (existingPayment) {
            return res.send("Transaction ID already exists!");
        }

        // Save payment record
        await payment.create({
            email: user.email,
            paymentMethod,
            accountNumber,
            transactionId,
            amount: 500,
            status: "paid"
        });

        // Activate Pro membership
        user.plan = "pro";
        await user.save();

        // Delete temporary Pro application
        await pro.findOneAndDelete({
            email: user.email
        });

        // Clear temporary token
        res.clearCookie("Pro_token");

        return res.redirect("/home");

    } catch (err) {
        console.log(err);
        return res.send("Demo Payment Failed!");
    }
});

// Add admin page
app.get("/add/admin", (req, res) => {
    res.render("addadmin");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});