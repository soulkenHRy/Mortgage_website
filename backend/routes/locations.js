const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiting');

// Get all locations
router.get('/', locationController.getAllLocations);

// Get specific location by name
router.get('/:locationName', locationController.getLocationByName);

// Refresh location data (admin only)
router.post('/refresh', adminLimiter, authenticateToken, locationController.refreshLocations);

module.exports = router;
