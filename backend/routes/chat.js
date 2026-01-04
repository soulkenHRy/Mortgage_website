const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Gemini AI chat endpoint
router.post('/gemini', chatController.chatWithAI);

module.exports = router;
