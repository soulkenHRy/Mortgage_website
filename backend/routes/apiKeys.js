const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { authenticateToken, validateApiKey } = require('../middleware/auth');

// Admin routes - require JWT authentication
// Generate a new API key
router.post('/generate', authenticateToken, apiKeyController.generateApiKey);

// List all API keys
router.get('/list', authenticateToken, apiKeyController.listApiKeys);

// Get specific API key details
router.get('/:id', authenticateToken, apiKeyController.getApiKey);

// Update API key
router.put('/:id', authenticateToken, apiKeyController.updateApiKey);

// Revoke/delete API key
router.delete('/:id', authenticateToken, apiKeyController.revokeApiKey);

// Get usage statistics for an API key
router.get('/:id/stats', authenticateToken, apiKeyController.getUsageStats);

// Public route - verify API key validity
router.post('/verify', validateApiKey, apiKeyController.verifyApiKey);

module.exports = router;
