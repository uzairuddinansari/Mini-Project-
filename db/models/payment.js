const mongoose = require("mongoose");

require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

mongoose.connect(process.env.MONGO_URL)

const paymentSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },

    paymentMethod: {
        type: String,
        enum: ["EasyPaisa", "JazzCash", "Bank Transfer"],
        required: true
    },

    accountNumber: {
        type: String,
        required: true
    },

    transactionId: {
        type: String,
        required: true,
        unique: true
    },

    amount: {
        type: Number,
        required: true,
        default: 500
    },

    status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("payment", paymentSchema);