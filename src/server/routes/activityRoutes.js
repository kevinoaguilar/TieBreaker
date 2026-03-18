const express = require('express');
const router = express.Router();
const { addActivity, getNearbyActivities } = require('../controllers/activityController');

// 1. Route to Add Activity
router.post('/activities', addActivity);

// 2. Route to Find Nearby
router.get('/activities/nearby', getNearbyActivities);

module.exports = router;