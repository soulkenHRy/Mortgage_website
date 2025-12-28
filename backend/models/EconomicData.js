const mongoose = require('mongoose');

const economicDataSchema = new mongoose.Schema({
  country: {
    type: String,
    default: 'Canada',
    required: true
  },
  inflation: {
    rate: Number,
    date: Date,
    source: String
  },
  centralBankRate: {
    rate: Number,
    date: Date,
    source: String,
    description: String
  },
  gdpGrowth: {
    rate: Number,
    quarter: String,
    year: Number,
    source: String
  },
  bondYield: {
    tenYear: Number,
    date: Date,
    source: String
  },
  unemployment: {
    rate: Number,
    date: Date,
    source: String
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EconomicData', economicDataSchema);
