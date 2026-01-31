const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  permissions: {
    type: [String],
    default: ['read'],
    enum: ['read', 'write', 'admin']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  lastUsed: {
    type: Date,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: null
  },
  ipWhitelist: {
    type: [String],
    default: []
  },
  rateLimit: {
    requestsPerHour: {
      type: Number,
      default: 1000
    },
    requestsPerDay: {
      type: Number,
      default: 10000
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate a secure API key
apiKeySchema.statics.generateKey = function() {
  const prefix = 'mk'; // mortgage key prefix
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${randomBytes}`;
};

// Check if key is expired
apiKeySchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Check if key is valid (active and not expired)
apiKeySchema.methods.isValid = function() {
  return this.isActive && !this.isExpired();
};

// Update usage statistics
apiKeySchema.methods.recordUsage = async function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  await this.save();
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
