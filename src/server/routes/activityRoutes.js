const express = require('express');
const router = express.Router();
const { addActivity, getNearbyActivities } = require('../controllers/activityController');

// IMPORT GEO SERVICE CORRECTLY (Up 2 levels to 'utils')
const { reverseGeocode } = require('../../../utils/geoService'); 

// 1. Route to Add Activity
router.post('/activities', addActivity);

// 2. Route to Find Nearby
router.get('/activities/nearby', getNearbyActivities);

// 3. Route for Reverse Geocoding (This is what is failing!)
router.post('/reverse-geocode', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const address = await reverseGeocode(lat, lng);
        
        if (address && address !== "Unknown Address") {
            res.json({ address });
        } else {
            res.status(400).json({ error: "Could not find address" });
        }
    } catch (error) {
        console.error("Route Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

module.exports = router;