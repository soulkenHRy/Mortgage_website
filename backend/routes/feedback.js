const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireVerification } = require('../middleware/auth');

// Submit feedback (requires verification)
router.post('/', requireVerification, feedbackController.submitFeedback);

// Get all feedback
router.get('/', feedbackController.getAllFeedback);

// Get user-specific feedback
router.get('/user/:username', feedbackController.getUserFeedback);

module.exports = router;
