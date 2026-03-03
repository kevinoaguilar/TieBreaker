const { getCoordinates } = require('../../../utils/geoService');
const Activity = require('../models/Activity');

const addActivity = async (req, res) => {
    try {
        const { name, address } = req.body;
        
        // Get the coordinates from Geocodio 
        const geoData = await getCoordinates(address);
        
        if (!geoData) {
            return res.status(400).json({ error: "Could not find that address" });
        }

        // Create the new document with coordinates for MongoDB
        const newActivity = new Activity({
            name,
            address: geoData.fullAddress,
            location: {
                type: 'Point',
                coordinates: geoData.coordinates // [longitude, latitude]
            }
        });

        await newActivity.save();
        res.status(201).json({ 
            message: "Activity added successfully!",
            data: newActivity 
        });
    } catch (error) {
        console.error("Add Activity Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { addActivity };

const getNearbyActivities = async (req, res) => {
    try {
        // 1. Get coordinates from the User
        const { lat, lng, radius } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: "Latitude and Longitude are required" });
        }

        // 2. Set distance, Default to 5 miles
        // MongoDB uses meters. 1 mile = ~1609 meters.
        const miles = radius || 5; 
        const maxDistanceInMeters = miles * 1609.34;

        // 3. The Geospatial Query
        const activities = await Activity.find({
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)] // MongoDB expects [Longitude, Latitude]
                    },
                    $maxDistance: maxDistanceInMeters
                }
            }
        });

        res.status(200).json({
            count: activities.length,
            radius: `${miles} miles`,
            data: activities
        });

    } catch (error) {
        console.error("Nearby Search Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
};

module.exports = { addActivity, getNearbyActivities };