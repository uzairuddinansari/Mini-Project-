const mongoose = require("mongoose");
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

mongoose.connect(process.env.MONGO_URL)

.then(() => console.log("MongoDB connected"))
.catch((err) => console.log(err));
const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    pass: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Admin", adminSchema);