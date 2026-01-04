const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireVerification } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiting');

// Login/Signup
router.post('/login', authLimiter, authController.login);

// Resend verification code
router.post('/resend-verification', authController.resendVerificationCode);

// Verify email
router.post('/verify-email', authController.verifyEmail);

// User data routes (protected)
router.get('/userdata/:username', authenticateToken, authController.getUserData);
router.post('/userdata/:username', authenticateToken, requireVerification, authController.saveUserData);

module.exports = router;
