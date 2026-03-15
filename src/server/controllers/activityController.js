const { getCoordinates } = require('../utils/geoService');
const Activity = require('../models/Activity');

// Add a new activity to the database (admin/seeding use)
const addActivity = async (req, res) => {
    try {
        const { name, address } = req.body;

        const geoData = await getCoordinates(address);
        if (!geoData) {
            return res.status(400).json({ error: "Could not find that address" });
        }

        const newActivity = new Activity({
            name,
            address: geoData.fullAddress,
            location: {
                type: 'Point',
                coordinates: geoData.coordinates // [longitude, latitude]
            }
        });
        await newActivity.save();

        res.status(201).json({ message: "Activity added!", data: newActivity });
    } catch (error) {
        console.error("Add Activity Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Find activities near a lat/lng (queries MongoDB)
const getNearbyActivities = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: "lat and lng are required" });
        }

        // Default to 5 miles. MongoDB uses meters so we convert.
        const miles              = radius || 5;
        const maxDistanceMeters  = miles * 1609.34;

        const activities = await Activity.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)] // MongoDB wants [lng, lat]
                    },
                    $maxDistance: maxDistanceMeters
                }
            }
        });

        res.status(200).json({ count: activities.length, radius: `${miles} miles`, data: activities });
    } catch (error) {
        console.error("Nearby Search Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

// FIX: only one module.exports at the bottom
module.exports = { addActivity, getNearbyActivities };