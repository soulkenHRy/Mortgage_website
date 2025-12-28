const mongoose = require('mongoose');

// This schema is flexible and can store any user-specific data as a JSON object
const userDataSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserData', userDataSchema);
