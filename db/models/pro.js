const mongoose = require("mongoose");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

mongoose.connect(process.env.MONGO_URL)
.then(() => {
    console.log("MongoDB connected");
})
.catch((err) => console.log(err));

const pro = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true,
        required: true
    },

    country: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true,
        unique: true
    },

    plan: {
        type: String,
        required: true
    },

    paymentMethod: {
        type: String,
        required: true
    },

    otp: {
        type: String
    },

    otpExpires: {
        type: Date
    },

    isVerified: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model("pro", pro);