const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

PORT = process.env.PORT || 8000;
if (!process.env.MONGODB_URI) {
    console.error("MongoDB URI is missing. Check your .env file.");
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
    mobile: String,
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    photo: String,
    resume: String,
    experience: Number,
    age: Number,
    gender: String
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

// Signup API
app.post("/signup", async (req, res) => {
    try {
        const { email, password, confirmPassword, mobile, name, experience, age, gender } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, mobile, name, experience, age, gender });
        await newUser.save();
        res.status(201).json({ message: "Signup successful!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login API
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ email: user.email, id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        res.json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update User API (Based on Email)
app.put("/update", async (req, res) => {
    try {
        const { email, newPassword, mobile, name, experience, age, gender } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (newPassword) {
            user.password = await bcrypt.hash(newPassword, 10);
        }
        if (mobile) user.mobile = mobile;
        if (name) user.name = name;
        if (experience !== undefined) user.experience = experience;
        if (age !== undefined) user.age = age;
        if (gender) user.gender = gender;
        await user.save();
        res.json({ message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload Image API (Based on Email)
app.post("/upload", upload.fields([{ name: "photo" }, { name: "resume" }]), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (req.files["photo"]) {
            user.photo = req.files["photo"][0].filename;
        }
        if (req.files["resume"]) {
            user.resume = req.files["resume"][0].filename;
        }
        await user.save();
        res.json({ message: "Files uploaded successfully", photo: user.photo, resume: user.resume });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use("/uploads", express.static("uploads"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
