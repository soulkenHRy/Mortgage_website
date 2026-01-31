const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireVerification = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token provided' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false, 
        error: 'Please verify your email before using this feature',
        requiresVerification: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// Middleware to validate API key for external applications
const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required. Provide it in x-api-key header or Authorization header.'
      });
    }

    // Find the API key in database
    const keyRecord = await ApiKey.findOne({ key: apiKey });

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Check if key is valid
    if (!keyRecord.isValid()) {
      return res.status(401).json({
        success: false,
        error: keyRecord.isExpired() ? 'API key has expired' : 'API key is inactive'
      });
    }

    // Check IP whitelist if configured
    if (keyRecord.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!keyRecord.ipWhitelist.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          error: 'IP address not authorized for this API key'
        });
      }
    }

    // Record usage (don't await to avoid blocking)
    keyRecord.recordUsage().catch(err => console.error('Error recording API key usage:', err));

    // Attach API key info to request
    req.apiKey = {
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      id: keyRecord._id
    };

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error validating API key'
    });
  }
};

// Middleware to check specific permission
const requireApiPermission = (permission) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API authentication required'
      });
    }

    if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }

    next();
  };
};

// Middleware that accepts EITHER JWT token OR API key (for private data access)
const authenticateJwtOrApiKey = async (req, res, next) => {
  try {
    // Try JWT token first
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // Check if it's a JWT token (not an API key)
      if (!token.startsWith('mk_')) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.user = decoded;
          req.authType = 'jwt';
          return next();
        } catch (err) {
          // Invalid JWT, continue to check API key
        }
      }
    }

    // Try API key
    const apiKey = req.headers['x-api-key'] || (authHeader && authHeader.replace('Bearer ', ''));
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Provide JWT token or API key.'
      });
    }

    const keyRecord = await ApiKey.findOne({ key: apiKey });

    if (!keyRecord || !keyRecord.isValid()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key'
      });
    }

    // Check IP whitelist if configured
    if (keyRecord.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!keyRecord.ipWhitelist.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          error: 'IP address not authorized'
        });
      }
    }

    keyRecord.recordUsage().catch(err => console.error('Error recording API key usage:', err));

    req.apiKey = {
      name: keyRecord.name,
      permissions: keyRecord.permissions,
      id: keyRecord._id
    };
    req.authType = 'apikey';

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

module.exports = { 
  authenticateToken, 
  requireVerification,
  validateApiKey,
  requireApiPermission,
  authenticateJwtOrApiKey
};
