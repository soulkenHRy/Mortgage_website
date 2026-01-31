const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { validateApiKey } = require('../middleware/auth');

// PRIVATE DATA - API key ONLY (server-to-server communication)
router.post('/calculator', validateApiKey, activityController.saveCalculatorActivity);
router.post('/chatbot', validateApiKey, activityController.saveChatbotActivity);
router.post('/prequalification', validateApiKey, activityController.savePrequalificationActivity);

router.get('/user/:username', validateApiKey, activityController.getUserActivities);
router.get('/user/:username/stats', validateApiKey, activityController.getUserActivityStats);

module.exports = router;
