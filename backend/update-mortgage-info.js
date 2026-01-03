const LocationData = require('./models/LocationData');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortgage-calculator';

// Function to get mortgage info for a location
function getMortgageInfoForLocation(locationName) {
  const baseResources = [
    {
      name: "Canada Mortgage and Housing Corporation (CMHC)",
      url: "https://www.cmhc-schl.gc.ca/",
      description: "Official government resource for mortgage insurance, housing market data, and homebuying guides",
      category: "Government"
    },
    {
      name: "Financial Consumer Agency of Canada",
      url: "https://www.canada.ca/en/financial-consumer-agency.html",
      description: "Federal agency providing mortgage calculators, budgeting tools, and consumer protection information",
      category: "Government"
    },
    {
      name: "RateSpy Mortgage Rate Comparison",
      url: "https://www.ratespy.com/",
      description: "Compare current mortgage rates from multiple lenders across Canada",
      category: "Rate Comparison"
    },
    {
      name: "Ratehub.ca",
      url: "https://www.ratehub.ca/",
      description: "Compare mortgages, credit cards, and financial products with real-time rates",
      category: "Rate Comparison"
    }
  ];

  // Location-specific resources
  const locationSpecificResources = {
    'Toronto Downtown': [
      {
        name: "Toronto Real Estate Board (TREB)",
        url: "https://trreb.ca/",
        description: "Official real estate board with market statistics and MLS listings for Toronto",
        category: "Local Real Estate"
      },
      {
        name: "City of Toronto - Property Tax",
        url: "https://www.toronto.ca/services-payments/property-taxes-utilities/",
        description: "Official property tax information and payment services",
        category: "City Resources"
      }
    ],
    'Mississauga': [
      {
        name: "Mississauga Real Estate Board",
        url: "https://www.mreb.ca/",
        description: "Local MLS listings and market data for Mississauga",
        category: "Local Real Estate"
      },
      {
        name: "City of Mississauga",
        url: "https://www.mississauga.ca/",
        description: "City services, property tax, and development information",
        category: "City Resources"
      }
    ],
    'Brampton': [
      {
        name: "Brampton Real Estate Board",
        url: "https://www.bramptonrealestateboard.com/",
        description: "Local real estate listings and market insights for Brampton",
        category: "Local Real Estate"
      }
    ],
    'Vaughan': [
      {
        name: "City of Vaughan",
        url: "https://www.vaughan.ca/",
        description: "City resources, building permits, and property information",
        category: "City Resources"
      }
    ],
    'Oakville': [
      {
        name: "Oakville Real Estate",
        url: "https://www.oakville.ca/",
        description: "Town of Oakville official website with property and tax information",
        category: "City Resources"
      }
    ]
  };

  const marketInsights = [
    `${locationName} is part of the Greater Toronto Area, one of Canada's most dynamic real estate markets`,
    "Property values in the GTA have shown steady long-term appreciation",
    "Access to major employment centers and excellent transit infrastructure",
    "Strong rental market for investment properties",
    "Diverse housing options from condos to single-family homes"
  ];

  const buyerTips = [
    "Get pre-approved for a mortgage before house hunting to understand your budget",
    "Factor in closing costs (typically 1.5-4% of purchase price) including land transfer tax",
    "Consider the Total Debt Service (TDS) ratio - aim to keep housing costs below 44% of gross income",
    "Explore first-time homebuyer programs like the Home Buyers' Plan (HBP) for RRSP withdrawals",
    "Work with a licensed mortgage broker to compare rates from multiple lenders",
    "Budget for ongoing costs: property taxes, utilities, maintenance, and condo fees (if applicable)",
    "Get a professional home inspection before finalizing your purchase",
    "Research the neighborhood: schools, amenities, and future development plans"
  ];

  const description = `${locationName} offers diverse housing options for homebuyers with varying budgets. ` +
    `Whether you're a first-time buyer or looking to upgrade, understanding local market conditions and ` +
    `securing the right mortgage are crucial steps. Current average home prices reflect the area's desirability, ` +
    `access to amenities, and proximity to employment centers. Consult with local mortgage specialists and ` +
    `real estate professionals who understand ${locationName}'s unique market dynamics.`;

  const trustedResources = [
    ...baseResources,
    ...(locationSpecificResources[locationName] || [])
  ];

  return {
    description,
    marketInsights,
    buyerTips,
    trustedResources
  };
}

// Main function to update all locations
async function updateAllLocationsMortgageInfo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const locations = await LocationData.find({});
    console.log(`📍 Found ${locations.length} locations to update\n`);

    let updatedCount = 0;

    for (const location of locations) {
      const mortgageInfo = getMortgageInfoForLocation(location.locationName);
      
      await LocationData.findOneAndUpdate(
        { locationName: location.locationName },
        { $set: { mortgageInfo: mortgageInfo } }
      );

      console.log(`✅ Updated ${location.locationName} - ${mortgageInfo.trustedResources.length} resources`);
      updatedCount++;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Successfully updated ${updatedCount}/${locations.length} locations`);
    console.log(`${'='.repeat(60)}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating locations:', error);
    process.exit(1);
  }
}

// Run the update
updateAllLocationsMortgageInfo();
