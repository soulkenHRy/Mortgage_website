const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  approved: {
    type: Boolean,
    default: false // For moderation purposes
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
