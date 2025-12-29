const mongoose = require('mongoose');

const propertyTypeDataSchema = new mongoose.Schema({
  averagePrice: Number,
  medianPrice: Number,
  priceRange: {
    low: Number,
    high: Number
  },
  averageDaysOnMarket: Number,
  inventoryCount: Number,
  pricePerSqFt: Number,
  description: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

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
  propertyTypes: {
    houses: propertyTypeDataSchema,
    condos: propertyTypeDataSchema,
    multiFamily: propertyTypeDataSchema,
    land: propertyTypeDataSchema,
    commercial: propertyTypeDataSchema
  },
  propertyTaxRate: {
    rate: {
      type: Number,
      required: false,
      default: null
    },
    annualTaxExample: {
      homePrice: Number,
      taxAmount: Number
    },
    description: String
  },
  additionalInfo: {
    averageDaysOnMarket: Number,
    demographics: {
      averageHouseholdIncome: Number,
      populationGrowth: String
    }
  },
  mortgageInfo: {
    description: String,
    marketInsights: [String],
    buyerTips: [String],
    trustedResources: [{
      name: String,
      url: String,
      description: String,
      category: String
    }]
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
