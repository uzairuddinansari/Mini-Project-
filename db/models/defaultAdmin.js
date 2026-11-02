// const mongoose = require("mongoose");
// require("dotenv").config();
// const dns = require("dns");
// dns.setServers(["8.8.8.8", "8.8.4.4"]);

// mongoose.connect(process.env.MONGO_URL)
// .then( async () => {
//     console.log("MongoDB connected");
//     await createAdmin();
// })
// .catch((err) => console.log(err));

// const adminSchema = new mongoose.Schema({
//     name: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     email: {
//         type: String,
//         required: true,
//         unique: true,
//         lowercase: true,
//         trim: true
//     },
//     pass: {
//         type: String,
//         required: true
//     },
//     role: {
//         type: String,
//         default: "admin"
//     }
// });

// module.exports = mongoose.model("Admin", adminSchema);