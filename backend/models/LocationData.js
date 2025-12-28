const mongoose = require('mongoose');

const locationDataSchema = new mongoose.Schema({
  locationName: {
    type: String,
    required: true,
    unique: true
  },
  region: {
    type: String,
    default: 'GTA Toronto'
  },
  averageHomePrice: {
    median: {
      type: Number,
      required: true
    },
    average: {
      type: Number,
      required: true
    },
    priceRange: {
      low: Number,
      high: Number
    },
    currency: {
      type: String,
      default: 'CAD'
    }
  },
  propertyTaxRate: {
    rate: {
      type: Number,
      required: false,  // Optional - may not be available from web data
      default: null
    },
    annualTaxExample: {
      homePrice: Number,
      taxAmount: Number
    },
    description: String
  },
  loanPrograms: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['First-time Homebuyer', 'Provincial Assistance', 'Federal Program', 'Regional Lending', 'Municipal Program'],
      required: true
    },
    description: String,
    eligibility: String,
    benefits: [String],
    link: String
  }],
  hoaFees: {
    applicable: {
      type: Boolean,
      default: false
    },
    averageMonthly: {
      low: Number,
      high: Number
    },
    commonIn: [String],
    description: String
  },
  insuranceEstimates: {
    homeownersInsurance: {
      monthlyLow: {
        type: Number,
        required: true
      },
      monthlyHigh: {
        type: Number,
        required: true
      },
      annualAverage: Number
    },
    floodInsurance: {
      required: {
        type: Boolean,
        default: false
      },
      monthlyEstimate: Number,
      floodZone: String
    },
    otherCoverage: [{
      type: {
        type: String
      },
      monthlyEstimate: Number,
      description: String
    }]
  },
  additionalInfo: {
    marketTrend: {
      type: String,
      enum: ['Rising', 'Stable', 'Declining', 'Hot Market', 'Cooling'],
      default: 'Stable'
    },
    averageDaysOnMarket: Number,
    walkScore: Number,
    transitScore: Number,
    schoolRating: Number,
    crimeIndex: String,
    demographics: {
      averageHouseholdIncome: Number,
      populationGrowth: String
    }
  },
  dataSource: {
    sources: [String],
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    nextUpdate: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
locationDataSchema.index({ locationName: 1 });
locationDataSchema.index({ region: 1 });

module.exports = mongoose.model('LocationData', locationDataSchema);
