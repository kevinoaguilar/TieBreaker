const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body; 
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ 
            username, 
            email, 
            password: hashedPassword 
        });
        
        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        console.error("Register Error:", err); // Added for debugging
        res.status(500).json({ error: "Registration failed. Username/Email may already exist." });
    }
};

exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body; // 'identifier' can be email or username

        // Search for a user where username OR email matches the identifier
        const user = await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier }
            ]
        });
        
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({ 
            message: "Login successful!", 
            token: token,
            user: { id: user._id, username: user.username }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};