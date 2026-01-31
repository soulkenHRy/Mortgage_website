const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true // Index for faster queries by username
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  activityType: {
    type: String,
    required: true,
    enum: ['calculator', 'chatbot', 'prequalification'],
    index: true // Index for faster queries by type
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for faster time-based queries
  }
});

// Compound index for efficient queries by user and activity type
userActivitySchema.index({ username: 1, activityType: 1, timestamp: -1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);
