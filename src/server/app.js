require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import Routes
const authRoutes = require('./routes/authRoutes.js');
const sessionRoutes = require('./routes/sessionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);


// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Successfully connected to TieBreaker-DB on Azure!"))
    .catch(err => console.error("Connection error:", err));

app.get('/', (req, res) => {
    res.send('TieBreaker Backend is live and connected!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});