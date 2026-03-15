const Session = require('../models/Session');

// POST /api/session/create
const createSession = async (req, res) => {
    try {
        const { username, category } = req.body;
        if (!username || !category) {
            return res.status(400).json({ success: false, error: "Username and category are required" });
        }

        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const moviePage = Math.floor(Math.random() * 10) + 1;

        const session = new Session({
            pin,
            category,
            users: [username],
            isActive: false,
            votes: [],
            hostPick: null,
            moviePage
        });

        await session.save();
        res.json({ success: true, pin });

    } catch (error) {
        console.error("Create Session Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// GET /api/session/:pin
const getSession = async (req, res) => {
    try {
        const { pin } = req.params;
        const session = await Session.findOne({ pin });

        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        res.json({
            success: true,
            users: session.users,
            category: session.category,
            isActive: session.isActive
        });

    } catch (error) {
        console.error("Get Session Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// POST /api/session/join
const joinSession = async (req, res) => {
    try {
        const { pin, username } = req.body;
        if (!pin || !username) {
            return res.status(400).json({ success: false, error: "Pin and username are required" });
        }

        const session = await Session.findOne({ pin });
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }
        if (session.isActive) {
            return res.status(400).json({ success: false, error: "Session already started" });
        }
        if (session.users.includes(username)) {
            return res.status(400).json({ success: false, error: "Username already in session" });
        }

        session.users.push(username);
        await session.save();

        res.json({ success: true, category: session.category, users: session.users });

    } catch (error) {
        console.error("Join Session Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// PUT /api/session/start/:pin
const startSession = async (req, res) => {
    try {
        const { pin } = req.params;
        const session = await Session.findOne({ pin });

        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        session.isActive = true;
        await session.save();

        res.json({ success: true, message: "Session started" });

    } catch (error) {
        console.error("Start Session Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// POST /api/session/:pin/vote
const submitVote = async (req, res) => {
    try {
        const { pin } = req.params;
        const { username, picks } = req.body;

        if (!username || !picks) {
            return res.status(400).json({ success: false, error: "Username and picks are required" });
        }

        const session = await Session.findOne({ pin });
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        const alreadyVoted = session.votes.some(v => v.username === username);
        if (alreadyVoted) {
            return res.json({ success: true, message: "Vote already recorded" });
        }

        session.votes.push({ username, picks });
        await session.save();

        res.json({ success: true, message: "Vote recorded" });

    } catch (error) {
        console.error("Submit Vote Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// POST /api/session/:pin/pick  (host only)
// Body: { pick: "The Batman" }
const setHostPick = async (req, res) => {
    try {
        const { pin } = req.params;
        const { pick } = req.body;

        if (!pick) {
            return res.status(400).json({ success: false, error: "Pick is required" });
        }

        const session = await Session.findOne({ pin });
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        session.hostPick = pick;
        await session.save();

        res.json({ success: true, pick });

    } catch (error) {
        console.error("Set Host Pick Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// GET /api/session/:pin/results
const getResults = async (req, res) => {
    try {
        const { pin } = req.params;
        const session = await Session.findOne({ pin });

        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        const totalVoters = session.users.length;
        const votesIn = session.votes.length;

        // Not everyone has voted yet
        if (votesIn < totalVoters) {
            return res.json({
                success: true,
                ready: false,
                message: `${votesIn} of ${totalVoters} people have voted`,
                hostPick: session.hostPick || null
            });
        }

        // Count votes per item
        const voteCounts = {};
        session.votes.forEach(userVote => {
            userVote.picks.forEach(pick => {
                voteCounts[pick] = (voteCounts[pick] || 0) + 1;
            });
        });

        // Nobody voted yes on anything
        if (Object.keys(voteCounts).length === 0) {
            return res.json({
                success: true,
                ready: true,
                resultType: 'none',
                matches: [],
                hostPick: session.hostPick || null
            });
        }

        // Perfect match — every voter said yes
        const perfectMatches = Object.keys(voteCounts).filter(
            item => voteCounts[item] === totalVoters
        );
        if (perfectMatches.length > 0) {
            return res.json({
                success: true,
                ready: true,
                resultType: perfectMatches.length === 1 ? 'perfect' : 'perfect_multi',
                matches: perfectMatches,
                hostPick: session.hostPick || null
            });
        }

        // Find highest vote count
        const topCount = Math.max(...Object.values(voteCounts));
        const topItems = Object.keys(voteCounts).filter(
            item => voteCounts[item] === topCount
        );

        if (topItems.length === 1) {
            return res.json({
                success: true,
                ready: true,
                resultType: 'winner',
                matches: topItems,
                voteCount: topCount,
                total: totalVoters,
                hostPick: session.hostPick || null
            });
        } else {
            return res.json({
                success: true,
                ready: true,
                resultType: 'tie',
                matches: topItems,
                voteCount: topCount,
                total: totalVoters,
                hostPick: session.hostPick || null
            });
        }

    } catch (error) {
        console.error("Get Results Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

module.exports = { createSession, getSession, joinSession, startSession, submitVote, setHostPick, getResults };