const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid'); // Tool to make IDs
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- TEMPORARY DATABASE (In-Memory) ---
// This will reset every time you save the file/restart server.
let sessions = [];

// --- ROUTES ---

// 1. Health Check
app.get('/', (req, res) => {
    res.send('TieBreaker Backend is Running!');
});

// 2. Create a New Session
app.post('/api/sessions', (req, res) => {
    // Generate a unique 6-character room code
    const sessionId = nanoid(6).toUpperCase();

    const newSession = {
        id: sessionId,
        host: req.body.hostName || 'Anonymous', // Get name from frontend, default to Anonymous
        decisionType: req.body.decisionType || 'Food', // Default to Food
        votes: [],
        isActive: true
    };

    // Save to our temporary list
    sessions.push(newSession);

    console.log(`🆕 Session Created: ${sessionId} by ${newSession.host}`);
    
    // Send the room code back to the frontend
    res.json({ success: true, sessionId: sessionId, message: 'Session created!' });
});

// 3. Get All Sessions (For debugging)
app.get('/api/sessions', (req, res) => {
    res.json(sessions);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});