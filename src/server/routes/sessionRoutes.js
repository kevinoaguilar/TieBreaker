const express = require('express');
const Session = require('../models/Session');
const router = express.Router();
const {
    createSession,
    joinSession,
    getSession,
    startSession,
    submitVote,
    setHostPick,
    getResults,
    leaveSession
} = require('../controllers/sessionController');

// --- Session management ---
router.post('/create', createSession);
router.post('/join', joinSession);
router.put('/start/:pin', startSession);
router.post('/:pin/leave', leaveSession);

// --- Voting & Results ---
router.post('/:pin/vote', submitVote);
router.post('/:pin/pick', setHostPick);
router.get('/:pin/results', getResults);

// --- Data routes (fetch options for voting) ---

// Movies: returns popular movies from TMDB
// The PIN is in the URL but not used — same movies for everyone (fine for MVP)
// Movies: returns popular movies from TMDB with runtime + certification
router.get('/:pin/movies', async (req, res) => {
    try {
        const KEY = process.env.TMDB_API_KEY;
        const session = await Session.findOne({ pin: req.params.pin });
        const page = session ? session.moviePage : 1;

        // Step 1: get the discover list
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

        // Step 2: fetch full details for each movie to get runtime + US cert
        const detailed = await Promise.all(results.map(async (movie) => {
            try {
                const detailResp = await fetch(
                    'https://api.themoviedb.org/3/movie/' + movie.id
                    + '?api_key=' + KEY
                    + '&append_to_response=release_dates'
                );
                const detail = await detailResp.json();

                // Pull US certification out of release_dates
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

// Food: returns restaurants near the host's location from Yelp
// Requires ?lat=&lng= query params
router.get('/:pin/food', async (req, res) => {
    try {
        let { lat, lng } = req.query;
        
        if (!lat || !lng) {
            const session = await Session.findOne({ pin: req.params.pin });
            if (session && session.location && session.location.lat && session.location.lng) {
                lat = session.location.lat;
                lng = session.location.lng;
            } else {
                return res.status(400).json({ error: 'Missing lat/lng — make sure location is enabled' });
            }
        }

        const url = 'https://api.yelp.com/v3/businesses/search'
            + '?latitude=' + lat
            + '&longitude=' + lng
            + '&categories=restaurants'
            + '&sort_by=review_count'
            + '&limit=50'
            + '&radius=24140';

        const response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + process.env.YELP_API_KEY }
        });
        const data = await response.json();
        data.businesses = (data.businesses || []).filter(b => b.review_count >= 100 && b.price);
        res.json(data);
    } catch (error) {
        console.error('Yelp food fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch restaurants' });
    }
});

// Activities: returns local things to do from Yelp
// Requires ?lat=&lng= query params
router.get('/:pin/activities', async (req, res) => {
    try {
        let { lat, lng } = req.query;
        
        if (!lat || !lng) {
            const session = await Session.findOne({ pin: req.params.pin });
            if (session && session.location && session.location.lat && session.location.lng) {
                lat = session.location.lat;
                lng = session.location.lng;
            } else {
                return res.status(400).json({ error: 'Missing lat/lng — make sure location is enabled' });
            }
        }

        const url = 'https://api.yelp.com/v3/businesses/search'
            + '?latitude=' + lat
            + '&longitude=' + lng
            + '&categories=bowling,escapegames,golf,minigolf,lasertag,amusementparks,arcades,trampolineparks,gokarts,axethrowing,rockclimbing,skatingrinks,paintball,zoos,aquariums,waterparks,zipline,billiards,movietheaters,museums'
            + '&sort_by=review_count'
            + '&limit=50'
            + '&radius=8047';

        const response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + process.env.YELP_API_KEY }
        });
        const data = await response.json();
        const foodCategories = ['restaurants','food','bars','lounges','thai','mexican','italian','chinese','japanese','korean','vietnamese','indian','american','pizza','burgers','sandwiches','seafood','sushi','breakfast_brunch','coffee','bakeries','delis','desserts','icecream','juicebars','nightlife','cocktailbars','sportsbars','wine_bars','pubs','breweries','karaoke'];
        let theaterCount = 0;
        data.businesses = (data.businesses || []).filter(b => {
            const cats = b.categories.map(c => c.alias);
            const hasFood = cats.some(c => foodCategories.includes(c));
            if (hasFood || b.review_count < 50) return false;
            if (cats.includes('movietheaters')) {
                theaterCount++;
                if (theaterCount > 1) return false;
            }
            return true;
        });
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