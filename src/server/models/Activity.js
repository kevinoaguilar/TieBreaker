const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    name: String,
    location: {
        type: {
            type: String, 
            enum: ['Point'], // Must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    address: String
});

activitySchema.index({ location: '2dsphere' });
module.exports = mongoose.model('Activity', activitySchema);