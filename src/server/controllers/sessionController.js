const Session = require('../models/Session');
const { seededShuffle } = require('../utils/seededShuffle');

// POST /api/session/create
const createSession = async (req, res) => {
    try {
        const { username, category } = req.body;
        if (!username || !category) {
            return res.status(400).json({ success: false, error: "Username and category are required" });
        }

        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const moviePage = Math.floor(Math.random() * 10) + 1;
        const foodOffset = Math.floor(Math.random() * 150);
        const activityOffset = Math.floor(Math.random() * 20);

        const session = new Session({
            pin,
            category,
            users: [username],
            isActive: false,
            votes: [],
            hostPick: null,
            moviePage,
            foodOffset,
            activityOffset
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
        
        // If the user is already in the session, just let them back in gracefully
        if (session.users.includes(username)) {
            return res.json({ success: true, category: session.category, users: session.users });
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
        const { lat, lng } = req.body || {}; // Extract host geolocation
        const session = await Session.findOne({ pin });

        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        session.isActive = true;
        if (lat && lng) {
            session.location = { lat, lng };
        }

        // Pre-fetch and cache food/activities so all users see the same list
        if (session.category === 'food' && lat && lng && !session.foodCache) {
            try {
                const foodData = await fetchYelpFood(lat, lng, session.foodOffset);
                seededShuffle(foodData.businesses, pin + 'food');
                session.foodCache = foodData;
            } catch (e) {
                console.error('Pre-fetch food error:', e);
            }
        }

        if (session.category === 'activities' && lat && lng && !session.activityCache) {
            try {
                const activityData = await fetchYelpActivities(lat, lng, session.activityOffset);
                seededShuffle(activityData.businesses, pin + 'activities');
                session.activityCache = activityData;
            } catch (e) {
                console.error('Pre-fetch activities error:', e);
            }
        }

        await session.save();

        res.json({ success: true, message: "Session started" });

    } catch (error) {
        console.error("Start Session Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// --- Yelp fetch helpers (used by startSession to pre-cache) ---

const foodCategories = ['restaurants', 'food', 'bars', 'lounges', 'thai', 'mexican', 'italian', 'chinese', 'japanese', 'korean', 'vietnamese', 'indian', 'american', 'pizza', 'burgers', 'sandwiches', 'seafood', 'sushi', 'breakfast_brunch', 'coffee', 'bakeries', 'delis', 'desserts', 'icecream', 'juicebars', 'nightlife', 'cocktailbars', 'sportsbars', 'wine_bars', 'pubs', 'breweries', 'karaoke'];

async function fetchYelpFood(lat, lng, offset) {
    async function doFetch(off) {
        const url = 'https://api.yelp.com/v3/businesses/search'
            + '?latitude=' + lat
            + '&longitude=' + lng
            + '&categories=restaurants'
            + '&sort_by=review_count'
            + '&limit=50'
            + '&radius=24140'
            + '&offset=' + off;
        const resp = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + process.env.YELP_API_KEY }
        });
        const d = await resp.json();
        d.businesses = (d.businesses || []).filter(b => b.review_count >= 100 && b.price);
        return d;
    }

    let data = await doFetch(offset);
    if (data.businesses.length === 0 && offset > 0) {
        data = await doFetch(0);
    }
    return data;
}

const ACTIVITY_CATEGORIES = 'bowling,escapegames,golf,minigolf,lasertag,amusementparks,arcades,trampolineparks,gokarts,axethrowing,rockclimbing,skatingrinks,paintball,zoos,aquariums,waterparks,zipline,billiards,movietheaters,museums,hikingtrails,parks,gardens,boating,surfing,skiing,horsebackriding,fitness,yoga,dancestudios,martialarts,swimmingpools,sportsteams,stadiumsarenas,beaches,playgrounds';

async function fetchYelpActivities(lat, lng, offset) {
    async function doFetch(off, radius, minReviews) {
        const url = 'https://api.yelp.com/v3/businesses/search'
            + '?latitude=' + lat
            + '&longitude=' + lng
            + '&categories=' + ACTIVITY_CATEGORIES
            + '&sort_by=review_count'
            + '&limit=50'
            + '&radius=' + radius
            + '&offset=' + off;
        const resp = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + process.env.YELP_API_KEY }
        });
        const d = await resp.json();
        let theaterCount = 0;
        d.businesses = (d.businesses || []).filter(b => {
            const cats = b.categories.map(c => c.alias);
            const hasFood = cats.some(c => foodCategories.includes(c));
            if (hasFood || b.review_count < minReviews) return false;
            if (cats.includes('movietheaters')) {
                theaterCount++;
                if (theaterCount > 1) return false;
            }
            return true;
        });
        return d;
    }

    // Try with offset first, then fallback to offset 0, then widen radius, then drop review filter
    let data = await doFetch(offset, 16093, 20);
    if (data.businesses.length < 10 && offset > 0) {
        data = await doFetch(0, 16093, 20);
    }
    if (data.businesses.length < 10) {
        data = await doFetch(0, 40000, 10);
    }
    if (data.businesses.length < 10) {
        data = await doFetch(0, 40000, 0);
    }
    return data;
}

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

// POST /api/session/:pin/leave
const leaveSession = async (req, res) => {
    try {
        const { pin } = req.params;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ success: false, error: "Username is required" });
        }

        const session = await Session.findOne({ pin });
        if (!session) {
            return res.status(404).json({ success: false, error: "Session not found" });
        }

        // Use Mongoose pull to cleanly remove the array item and save
        session.users.pull(username);
        await session.save();

        res.json({ success: true, message: "Left session" });
    } catch (error) {
        console.error("Leave Session Error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

module.exports = { createSession, getSession, joinSession, startSession, submitVote, setHostPick, getResults, leaveSession };