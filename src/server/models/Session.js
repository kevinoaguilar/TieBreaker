const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    pin: { type: String, required: true, unique: true },
    users: [String],
    category: { type: String, default: 'food' },
    location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    status: {
        type: String,
        enum: ['waiting', 'started', 'completed'],
        default: 'waiting'
    },
    isActive: { type: Boolean, default: true },

    // Stores each user's yes-votes so we can calculate matches
    // Example: [{ username: "Alice", picks: ["The Batman", "Dune"] }]
    votes: [{
        username: String,
        picks: [String]
    }],

    moviePage: { type: Number, default: 1 },
    foodOffset: { type: Number, default: 0 },
    activityOffset: { type: Number, default: 0 },

    // Cached Yelp results — first user fetch populates these, then everyone gets the same list
    foodCache: { type: mongoose.Schema.Types.Mixed, default: null },
    activityCache: { type: mongoose.Schema.Types.Mixed, default: null },

    // Set by the host when there are multiple matches/ties — stores the final pick
    hostPick: { type: String, default: null },

    // Sessions automatically delete from the DB after 24 hours
    createdAt: { type: Date, default: Date.now, expires: 86400 }
});

module.exports = mongoose.model('Session', sessionSchema);