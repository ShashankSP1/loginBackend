const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { error } = require("console");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

//mongodb+srv://Shashank:<db_password>@shashank.e1gzg.mongodb.net/?retryWrites=true&w=majority&appName=Shashank

//"mongodb://localhost:27017/Developers"
// mongoose.connect(`${process.env.MONGODB_URI}`, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

//  mongoose.connect(`${process.env.MONGODB_URI}`)
//   .then(()=> console.log("Connected sucessfully"))
//   .catch((err) => console.log("Not Connected  "+err))

//   console.log(`${process.env.MONGODB_URI}`)

if (!process.env.MONGODB_URI) {
    console.error("MongoDB URI is missing. Check your .env file.");
    process.exit(1); // Stop execution
}

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("Connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
    mobile: String,
    name: String,
    email: { type: String, unique: true },
    password: String,
    photo: String,
    resume: String,
    experience: Number,
    age: Number,
    gender: String,
});

const User = mongoose.model("User", UserSchema);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); 
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post("/signup", upload.fields([{ name: "photo" }, { name: "resume" }]), async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({
            ...req.body,
            password: hashedPassword,
            photo: req.files["photo"] ? req.files["photo"][0].filename : null,
            resume: req.files["resume"] ? req.files["resume"][0].filename : null
        });
        await newUser.save();
        res.status(201).json({ message: "Signup successful!" });
    } 
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1h" });
        res.json({ message: "Login successful!", token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.use("/uploads", express.static("uploads"));

app.listen(5000, () => console.log("Server running on port 5000"));
