require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// --- DATABASE CONNECTION ---
// We use the URI from your screenshot here
const mongoURI = "mongodb+srv://kaguilar:bzhulATvKoMEZ4MQ@tiebreaker-db.qvak35y.mongodb.net/TieBreaker?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("Successfully connected to TieBreaker-DB on Azure!"))
    .catch(err => console.error("Connection error:", err));

app.get('/', (req, res) => {
    res.send('TieBreaker Backend is live and connected!');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

console.log("My Secret Key is:", process.env.JWT_SECRET);