const ApiKey = require('../models/ApiKey');

// Generate a new API key (admin only)
exports.generateApiKey = async (req, res) => {
  try {
    const { name, description, permissions, expiresInDays, ipWhitelist, rateLimit } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'API key name is required'
      });
    }

    // Generate secure API key
    const key = ApiKey.generateKey();

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    }

    // Get the admin username from JWT token
    const createdBy = req.user?.username || req.user?.email || 'admin';

    // Create the API key record
    const apiKey = new ApiKey({
      key,
      name,
      description: description || '',
      permissions: permissions || ['read'],
      expiresAt,
      ipWhitelist: ipWhitelist || [],
      rateLimit: rateLimit || {
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      createdBy
    });

    await apiKey.save();

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      apiKey: {
        key, // Only show the key once during creation
        id: apiKey._id,
        name: apiKey.name,
        description: apiKey.description,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API key'
    });
  }
};

// List all API keys (admin only) - keys are masked
exports.listApiKeys = async (req, res) => {
  try {
    const { includeInactive } = req.query;

    const query = includeInactive === 'true' ? {} : { isActive: true };

    const apiKeys = await ApiKey.find(query)
      .select('-key') // Don't return the actual key
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: apiKeys.length,
      apiKeys: apiKeys.map(key => ({
        id: key._id,
        name: key.name,
        description: key.description,
        permissions: key.permissions,
        isActive: key.isActive,
        keyPreview: key.key ? `${key.key.substring(0, 10)}...` : 'N/A',
        createdBy: key.createdBy,
        lastUsed: key.lastUsed,
        usageCount: key.usageCount,
        expiresAt: key.expiresAt,
        ipWhitelist: key.ipWhitelist,
        rateLimit: key.rateLimit,
        createdAt: key.createdAt
      }))
    });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys'
    });
  }
};

// Get API key details by ID (admin only)
exports.getApiKey = async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await ApiKey.findById(id).select('-key');

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    res.status(200).json({
      success: true,
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        description: apiKey.description,
        permissions: apiKey.permissions,
        isActive: apiKey.isActive,
        keyPreview: apiKey.key ? `${apiKey.key.substring(0, 10)}...` : 'N/A',
        createdBy: apiKey.createdBy,
        lastUsed: apiKey.lastUsed,
        usageCount: apiKey.usageCount,
        expiresAt: apiKey.expiresAt,
        ipWhitelist: apiKey.ipWhitelist,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt
      }
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API key details'
    });
  }
};

// Update API key (admin only)
exports.updateApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive, ipWhitelist, rateLimit } = req.body;

    const apiKey = await ApiKey.findById(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    // Update fields
    if (name !== undefined) apiKey.name = name;
    if (description !== undefined) apiKey.description = description;
    if (permissions !== undefined) apiKey.permissions = permissions;
    if (isActive !== undefined) apiKey.isActive = isActive;
    if (ipWhitelist !== undefined) apiKey.ipWhitelist = ipWhitelist;
    if (rateLimit !== undefined) apiKey.rateLimit = rateLimit;

    await apiKey.save();

    res.status(200).json({
      success: true,
      message: 'API key updated successfully',
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        description: apiKey.description,
        permissions: apiKey.permissions,
        isActive: apiKey.isActive
      }
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update API key'
    });
  }
};

// Revoke/delete API key (admin only)
exports.revokeApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanently } = req.query;

    const apiKey = await ApiKey.findById(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    if (permanently === 'true') {
      // Permanently delete
      await ApiKey.findByIdAndDelete(id);
      res.status(200).json({
        success: true,
        message: 'API key permanently deleted'
      });
    } else {
      // Just deactivate
      apiKey.isActive = false;
      await apiKey.save();
      res.status(200).json({
        success: true,
        message: 'API key revoked (deactivated)'
      });
    }
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key'
    });
  }
};

// Verify an API key (public endpoint for testing)
exports.verifyApiKey = async (req, res) => {
  try {
    // This endpoint uses the validateApiKey middleware
    // If we reach here, the key is valid
    res.status(200).json({
      success: true,
      message: 'API key is valid',
      keyInfo: {
        name: req.apiKey.name,
        permissions: req.apiKey.permissions
      }
    });
  } catch (error) {
    console.error('Error verifying API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify API key'
    });
  }
};

// Get API key usage statistics (admin only)
exports.getUsageStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;

    const apiKey = await ApiKey.findById(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalUsage: apiKey.usageCount,
        lastUsed: apiKey.lastUsed,
        isActive: apiKey.isActive,
        isExpired: apiKey.isExpired(),
        daysUntilExpiration: apiKey.expiresAt 
          ? Math.ceil((apiKey.expiresAt - new Date()) / (1000 * 60 * 60 * 24))
          : null
      }
    });
  } catch (error) {
    console.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
};
