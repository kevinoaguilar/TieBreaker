const axios = require('axios');

const getCoordinates = async (address) => {
    try {
        const apiKey = process.env.GEOCODIO_API_KEY;
        const encodedAddress = encodeURIComponent(address);
        const url = `https://api.geocod.io/v1.1/geocode?q=${encodedAddress}&api_key=${apiKey}`;
        
        const response = await axios.get(url);
        
        if (response.data.results && response.data.results.length > 0) {
            const bestResult = response.data.results[0];
            return {
                fullAddress: bestResult.formatted_address,
                coordinates: [bestResult.location.lng, bestResult.location.lat]
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding Error:", error.message);
        return null;
    }
};

const reverseGeocode = async (lat, lng) => {
    try {
        const apiKey = process.env.GEOCODIO_API_KEY;
        const url = `https://api.geocod.io/v1.1/reverse?q=${lat},${lng}&api_key=${apiKey}`;
        
        const response = await axios.get(url);
        
        if (response.data.results && response.data.results.length > 0) {
            return response.data.results[0].formatted_address;
        }
        return "Unknown Address";
    } catch (error) {
        console.error("Reverse Geocoding Error:", error.message);
        return null;
    }
};

module.exports = { getCoordinates, reverseGeocode };