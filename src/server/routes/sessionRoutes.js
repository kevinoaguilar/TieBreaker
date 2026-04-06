const express = require('express');
const Session = require('../models/Session');
const router = express.Router();

// Deterministic seeded PRNG so every user in a session sees the same order
function seededRandom(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) {
        s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
    }
    return function () {
        s = (s * 1664525 + 1013904223) | 0;
        return ((s >>> 0) / 4294967296);
    };
}

function seededShuffle(arr, seed) {
    const rng = seededRandom(seed);
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const {
    createSession,
    joinSession,
    getSession,
    submitVote,
    setHostPick,
    getResults,
    leaveSession
} = require('../controllers/sessionController');

// ─── Yelp fetch helpers ───────────────────────────────────────────────────────
// Extracted so both the /start pre-warm and the data routes share the same logic.

async function fetchAndCacheFood(session, lat, lng) {
    const offset = session.foodOffset || 0;

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

    seededShuffle(data.businesses, session.pin + 'food');
    session.foodCache = data;
    session.markModified('foodCache');
    await session.save();
    return data;
}

const FOOD_CATEGORIES = [
    'restaurants', 'food', 'bars', 'lounges', 'thai', 'mexican', 'italian',
    'chinese', 'japanese', 'korean', 'vietnamese', 'indian', 'american',
    'pizza', 'burgers', 'sandwiches', 'seafood', 'sushi', 'breakfast_brunch',
    'coffee', 'bakeries', 'delis', 'desserts', 'icecream', 'juicebars',
    'nightlife', 'cocktailbars', 'sportsbars', 'wine_bars', 'pubs',
    'breweries', 'karaoke'
];

async function fetchAndCacheActivities(session, lat, lng) {
    const offset = session.activityOffset || 0;

    async function doFetch(off, radius) {
        const url = 'https://api.yelp.com/v3/businesses/search'
            + '?latitude=' + lat
            + '&longitude=' + lng
            + '&categories=bowling,escapegames,golf,minigolf,lasertag,amusementparks,arcades,trampolineparks,gokarts,axethrowing,rockclimbing,skatingrinks,paintball,zoos,aquariums,waterparks,zipline,billiards,movietheaters,museums'
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
            if (cats.some(c => FOOD_CATEGORIES.includes(c))) return false;
            if (b.review_count < 25) return false;
            if (cats.includes('movietheaters')) {
                theaterCount++;
                if (theaterCount > 1) return false;
            }
            return true;
        });
        return d;
    }

    // Start with 15-mile radius (expanded from original 5 miles)
    let data = await doFetch(offset, 24140);
    if (data.businesses.length === 0 && offset > 0) {
        data = await doFetch(0, 24140);
    }

    // If still under 10, pull a wider net and merge (deduplicate by id)
    if (data.businesses.length < 10) {
        const wider = await doFetch(0, 40000);
        const seen = new Set(data.businesses.map(b => b.id));
        const extra = wider.businesses.filter(b => !seen.has(b.id));
        data.businesses = [...data.businesses, ...extra];
    }

    seededShuffle(data.businesses, session.pin + 'activities');
    session.activityCache = data;
    session.markModified('activityCache');
    await session.save();
    return data;
}

// ─── Session management ───────────────────────────────────────────────────────

router.post('/create', createSession);
router.post('/join', joinSession);

// Start: save isActive + location, then pre-warm cache so every user
// hits a populated cache and sees the same order as the host.
router.put('/start/:pin', async (req, res) => {
    try {
        const { pin } = req.params;
        const { lat, lng } = req.body || {};
        const session = await Session.findOne({ pin });

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Save location first (isActive stays false while cache is being built)
        if (lat && lng) {
            session.location = { lat, lng };
            await session.save();
        }

        // Pre-warm cache BEFORE marking the session active.
        // Users poll getSession every 2s and redirect when they see isActive = true.
        // By setting isActive only after the cache is ready, every user — regardless
        // of how many — is guaranteed to hit a populated cache and see the same list.
        if (session.category === 'food' && lat && lng) {
            await fetchAndCacheFood(session, lat, lng);
        } else if (session.category === 'activities' && lat && lng) {
            await fetchAndCacheActivities(session, lat, lng);
        }

        session.isActive = true;
        await session.save();

        res.json({ success: true, message: 'Session started' });
    } catch (error) {
        console.error('Start Session Error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.post('/:pin/leave', leaveSession);

// ─── Voting & Results ─────────────────────────────────────────────────────────

router.post('/:pin/vote', submitVote);
router.post('/:pin/pick', setHostPick);
router.get('/:pin/results', getResults);

// ─── Data routes ──────────────────────────────────────────────────────────────

// Movies: returns popular movies from TMDB with runtime + certification
router.get('/:pin/movies', async (req, res) => {
    try {
        const KEY = process.env.TMDB_API_KEY;
        const session = await Session.findOne({ pin: req.params.pin });
        const page = session ? session.moviePage : 1;

        const discoverResp = await fetch(
            'https://api.themoviedb.org/3/discover/movie'
            + '?api_key=' + KEY
            + '&language=en-US'
            + '&region=US'
            + '&sort_by=popularity.desc'
            + '&vote_count.gte=5000'
            + '&vote_average.gte=7'
            + '&page=' + page
            + '&with_original_language=en'
        );
        const discoverData = await discoverResp.json();

        const results = (discoverData.results || [])
            .filter(m => m.poster_path)
            .slice(0, 10);

        const detailed = await Promise.all(results.map(async (movie) => {
            try {
                const detailResp = await fetch(
                    'https://api.themoviedb.org/3/movie/' + movie.id
                    + '?api_key=' + KEY
                    + '&append_to_response=release_dates'
                );
                const detail = await detailResp.json();

                let cert = 'NR';
                const usEntry = (detail.release_dates?.results || [])
                    .find(r => r.iso_3166_1 === 'US');
                if (usEntry) {
                    const rated = usEntry.release_dates.find(d => d.certification);
                    if (rated) cert = rated.certification;
                }

                return {
                    ...movie,
                    runtime: detail.runtime || null,
                    certification: cert
                };
            } catch (e) {
                return { ...movie, runtime: null, certification: 'NR' };
            }
        }));

        res.json({ results: detailed });
    } catch (error) {
        console.error('TMDB fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

// Food: returns cached results (pre-warmed at start); fetches on demand as fallback
router.get('/:pin/food', async (req, res) => {
    try {
        let { lat, lng } = req.query;
        const session = await Session.findOne({ pin: req.params.pin });

        if (session && session.foodCache) {
            return res.json(session.foodCache);
        }

        if (!lat || !lng) {
            if (session && session.location && session.location.lat && session.location.lng) {
                lat = session.location.lat;
                lng = session.location.lng;
            } else {
                return res.status(400).json({ error: 'Missing lat/lng — make sure location is enabled' });
            }
        }

        const data = await fetchAndCacheFood(session, lat, lng);
        res.json(data);
    } catch (error) {
        console.error('Yelp food fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch restaurants' });
    }
});

// Activities: returns cached results (pre-warmed at start); fetches on demand as fallback
router.get('/:pin/activities', async (req, res) => {
    try {
        let { lat, lng } = req.query;
        const session = await Session.findOne({ pin: req.params.pin });

        if (session && session.activityCache) {
            return res.json(session.activityCache);
        }

        if (!lat || !lng) {
            if (session && session.location && session.location.lat && session.location.lng) {
                lat = session.location.lat;
                lng = session.location.lng;
            } else {
                return res.status(400).json({ error: 'Missing lat/lng — make sure location is enabled' });
            }
        }

        const data = await fetchAndCacheActivities(session, lat, lng);
        res.json(data);
    } catch (error) {
        console.error('Yelp activities fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// IMPORTANT: /:pin must come LAST
// If it were first, it would catch /:pin/movies and /:pin/food before they could match
router.get('/:pin', getSession);

module.exports = router;
