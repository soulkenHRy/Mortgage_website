const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    trim: true,
    lowercase: true // Prevents "John" and "john" as separate accounts
  },
  password: { type: String, required: true },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true // Prevents "User@Email.com" and "user@email.com"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpires: {
    type: Date,
    default: null
  },
  lastLoginIP: {
    type: String,
    default: null
  },
  accountCreatedIP: {
    type: String,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for faster queries and uniqueness
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model('User', userSchema);
