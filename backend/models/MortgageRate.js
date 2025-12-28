const mongoose = require('mongoose');

const mortgageRateSchema = new mongoose.Schema({
  // Fixed rates for different terms (1-10 years)
  fixedRates: {
    oneYear: { type: Number, default: null },
    twoYear: { type: Number, default: null },
    threeYear: { type: Number, default: null },
    fourYear: { type: Number, default: null },
    fiveYear: { type: Number, default: null },
    sixYear: { type: Number, default: null },
    sevenYear: { type: Number, default: null },
    eightYear: { type: Number, default: null },
    nineYear: { type: Number, default: null },
    tenYear: { type: Number, default: null }
  },

  // Payment per $100k for each term
  paymentsPerHundredK: {
    oneYear: { type: Number, default: null },
    twoYear: { type: Number, default: null },
    threeYear: { type: Number, default: null },
    fourYear: { type: Number, default: null },
    fiveYear: { type: Number, default: null },
    sixYear: { type: Number, default: null },
    sevenYear: { type: Number, default: null },
    eightYear: { type: Number, default: null },
    nineYear: { type: Number, default: null },
    tenYear: { type: Number, default: null }
  },

  // Bank of Canada Policy Rate
  bankRate: { type: Number, default: null },

  // Variable and Prime rates
  currentVariableRate: { type: Number, default: null },
  currentPrimeRate: { type: Number, default: null },

  // Insured vs Uninsured rates (for 5-year fixed as reference)
  insuredRates: {
    fiveYearFixed: { type: Number, default: null }
  },
  uninsuredRates: {
    fiveYearFixed: { type: Number, default: null }
  },

  // Metadata
  country: {
    type: String,
    default: 'Canada',
    required: true
  },
  source: {
    type: String,
    default: 'RateHub.ca'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  scrapedSuccessfully: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MortgageRate', mortgageRateSchema);
