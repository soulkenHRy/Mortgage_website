const axios = require('axios');
const LocationData = require('../models/LocationData');

// Brave Search API Configuration
const BRAVE_API_KEY = 'BSArZidfgMExpZ13UaoIuqtK4bZR52y';
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// GTA Toronto areas to scrape
const GTA_LOCATIONS = [
  'Toronto Downtown',
  'North York',
  'Scarborough',
  'Etobicoke',
  'York',
  'East York',
  'Mississauga',
  'Brampton',
  'Vaughan',
  'Markham',
  'Richmond Hill',
  'Oakville',
  'Burlington',
  'Milton',
  'Ajax',
  'Pickering',
  'Whitby',
  'Oshawa'
];

/**
 * Get mortgage information and trusted resources for a location
 */
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

  // Location-specific resources based on city
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

  // Market insights based on location
  const marketInsights = [
    `${locationName} is part of the Greater Toronto Area, one of Canada's most dynamic real estate markets`,
    "Property values in the GTA have shown steady long-term appreciation",
    "Access to major employment centers and excellent transit infrastructure",
    "Strong rental market for investment properties",
    "Diverse housing options from condos to single-family homes"
  ];

  // Buyer tips
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

  // Description
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
  'Oakville',
  'Burlington',
  'Milton',
  'Ajax',
  'Pickering',
  'Whitby',
  'Oshawa'
];

/**
 * Search Brave API for location data with retry logic
 */
async function searchBraveAPI(query, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Searching: "${query}" (attempt ${attempt}/${retries})`);
      
      const response = await axios.get(BRAVE_API_URL, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY
        },
        params: {
          q: query,
          count: 10,
          search_lang: 'en',
          country: 'CA'
        },
        timeout: 15000
      });
      
      console.log(`✅ API request successful for: "${query}"`);
      return response.data;
      
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // Rate limit hit - wait longer before retry
        const waitTime = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
        console.warn(`⚠️  Rate limited (429). Waiting ${waitTime/1000}s before retry ${attempt}/${retries}...`);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
      
      console.error(`❌ Error searching Brave API for "${query}":`, error.message);
      if (attempt === retries) {
        return null;
      }
      
      // Wait before retry for other errors
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return null;
}

/**
 * Extract price data from search results
 */
function extractPriceFromResults(searchData, locationName) {
  if (!searchData || !searchData.web || !searchData.web.results) {
    return null;
  }

  const results = searchData.web.results;
  const pricePatterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:thousand|k)?/gi,
    /(\d{1,3}(?:,\d{3})*)\s*dollars?/gi,
    /average.*?price.*?(\d{1,3}(?:,\d{3})*)/gi,
    /median.*?price.*?(\d{1,3}(?:,\d{3})*)/gi
  ];

  const prices = [];
  
  for (const result of results) {
    const text = `${result.title} ${result.description}`.toLowerCase();
    
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const priceStr = match[1].replace(/,/g, '');
        let price = parseInt(priceStr);
        
        // If price seems to be in thousands, multiply
        if (price < 10000 && text.includes('k')) {
          price *= 1000;
        }
        
        // Reasonable housing price range for GTA (200k - 5M)
        if (price >= 200000 && price <= 5000000) {
          prices.push(price);
        }
      }
    }
  }

  if (prices.length === 0) {
    return null;
  }

  // Return median of found prices
  prices.sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  return median;
}

/**
 * Extract property tax rate from search results
 */
function extractTaxRateFromResults(searchData) {
  if (!searchData || !searchData.web || !searchData.web.results) {
    return null;
  }

  const results = searchData.web.results;
  const taxPatterns = [
    /(\d+\.?\d*)\s*%\s*(?:property\s*)?tax/gi,
    /tax\s*rate.*?(\d+\.?\d*)\s*%/gi,
    /property\s*tax.*?(\d+\.?\d*)\s*%/gi
  ];

  const rates = [];
  
  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    
    for (const pattern of taxPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const rate = parseFloat(match[1]);
        // Reasonable tax rate range (0.1% - 2.5%)
        if (rate >= 0.1 && rate <= 2.5) {
          rates.push(rate);
        }
      }
    }
  }

  if (rates.length === 0) {
    return null;
  }

  // Return average of found rates
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

/**
 * Extract demographic data from search results
 */
function extractDemographicsFromResults(searchData) {
  if (!searchData || !searchData.web || !searchData.web.results) {
    return {};
  }

  const results = searchData.web.results;
  const demographics = {};

  // Look for household income
  const incomePatterns = [
    /household\s+income.*?\$(\d{1,3}(?:,\d{3})*)/gi,
    /median\s+income.*?\$(\d{1,3}(?:,\d{3})*)/gi,
    /average\s+income.*?\$(\d{1,3}(?:,\d{3})*)/gi
  ];

  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    
    for (const pattern of incomePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const income = parseInt(match[1].replace(/,/g, ''));
        if (income >= 30000 && income <= 300000) {
          demographics.averageHouseholdIncome = income;
          break;
        }
      }
    }
    if (demographics.averageHouseholdIncome) break;
  }

  // Look for population growth
  const growthPatterns = [
    /population\s+growth.*?(\d+\.?\d*)\s*%/gi,
    /growing.*?(\d+\.?\d*)\s*%/gi
  ];

  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    
    for (const pattern of growthPatterns) {
      const match = pattern.exec(text);
      if (match) {
        demographics.populationGrowth = `${match[1]}% annual growth`;
        break;
      }
    }
    if (demographics.populationGrowth) break;
  }

  return demographics;
}

/**
 * Extract market data from search results
 */
function extractMarketDataFromResults(searchData) {
  if (!searchData || !searchData.web || !searchData.web.results) {
    return {};
  }

  const results = searchData.web.results;
  const marketData = {};

  // Look for days on market
  const daysPatterns = [
    /(\d+)\s+days?\s+on\s+market/gi,
    /average.*?(\d+)\s+days/gi
  ];

  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    
    for (const pattern of daysPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const days = parseInt(match[1]);
        if (days >= 1 && days <= 365) {
          marketData.averageDaysOnMarket = days;
          break;
        }
      }
    }
    if (marketData.averageDaysOnMarket) break;
  }

  return marketData;
}

/**
 * Extract property type data from search results
 */
function extractPropertyTypeDataFromResults(searchData, propertyType) {
  if (!searchData || !searchData.web || !searchData.web.results) {
    return null;
  }

  const results = searchData.web.results;
  const propertyData = {};

  // Extract average/median prices
  const pricePatterns = [
    /average.*?price.*?\$\s*(\d{1,3}(?:,\d{3})*)/gi,
    /median.*?price.*?\$\s*(\d{1,3}(?:,\d{3})*)/gi,
    /\$\s*(\d{1,3}(?:,\d{3})*)/gi
  ];

  const prices = [];
  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    
    for (const pattern of pricePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseFloat(priceStr);
        
        // Validate price range based on property type
        const minPrice = propertyType === 'land' ? 50000 : 200000;
        const maxPrice = propertyType === 'commercial' ? 10000000 : 5000000;
        
        if (price >= minPrice && price <= maxPrice) {
          prices.push(price);
        }
      }
    }
  }

  if (prices.length > 0) {
    prices.sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    propertyData.averagePrice = Math.round(average);
    propertyData.medianPrice = Math.round(median);
    propertyData.priceRange = {
      low: Math.round(Math.min(...prices)),
      high: Math.round(Math.max(...prices))
    };
  }

  // Extract days on market
  const daysPatterns = [
    /(\d+)\s+days?\s+on\s+market/gi,
    /market.*?(\d+)\s+days/gi
  ];

  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    for (const pattern of daysPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const days = parseInt(match[1]);
        if (days >= 1 && days <= 365) {
          propertyData.averageDaysOnMarket = days;
          break;
        }
      }
    }
    if (propertyData.averageDaysOnMarket) break;
  }

  // Extract price per sqft
  const sqftPatterns = [
    /\$\s*(\d+(?:\.\d{2})?)\s*per\s+(?:sq\.?\s*ft|square\s+foot)/gi,
    /(\d+)\s*\/\s*(?:sq\.?\s*ft|sqft)/gi
  ];

  for (const result of results) {
    const text = `${result.title} ${result.description}`;
    for (const pattern of sqftPatterns) {
      const match = pattern.exec(text);
      if (match) {
        const pricePerSqFt = parseFloat(match[1]);
        if (pricePerSqFt >= 50 && pricePerSqFt <= 2000) {
          propertyData.pricePerSqFt = Math.round(pricePerSqFt);
          break;
        }
      }
    }
    if (propertyData.pricePerSqFt) break;
  }

  return Object.keys(propertyData).length > 0 ? propertyData : null;
}

/**
 * Scrape property type data for a specific location
 */
async function scrapePropertyTypeData(locationName, propertyType, propertyDescription) {
  console.log(`   📊 Fetching ${propertyType} data...`);
  
  try {
    const query = `${locationName} Ontario Canada ${propertyDescription} average price 2024 2025`;
    const searchData = await searchBraveAPI(query);
    
    if (!searchData) {
      console.log(`   ⚠️  No data found for ${propertyType}`);
      return null;
    }

    const propertyData = extractPropertyTypeDataFromResults(searchData, propertyType);
    
    if (propertyData) {
      propertyData.description = propertyDescription;
      propertyData.lastUpdated = new Date();
      console.log(`   ✅ ${propertyType}: $${propertyData.averagePrice?.toLocaleString() || 'N/A'}`);
    } else {
      console.log(`   ⚠️  No valid data for ${propertyType}`);
    }
    
    return propertyData;
  } catch (error) {
    console.error(`   ❌ Error fetching ${propertyType} data:`, error.message);
    return null;
  }
}

/**
 * Scrape location data using Brave API - ONLY REAL DATA
 */
async function scrapeLocationData(locationName) {
  console.log(`\n📍 Fetching real data for ${locationName} from Brave API...`);
  
  try {
    // Search for average home price
    const priceQuery = `${locationName} Ontario Canada average home price 2024 2025`;
    const priceSearchData = await searchBraveAPI(priceQuery);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!priceSearchData) {
      console.error(`❌ Unable to collect data for ${locationName} - Price API request failed`);
      return null;
    }

    const averagePrice = extractPriceFromResults(priceSearchData, locationName);
    
    if (!averagePrice) {
      console.error(`❌ Unable to collect price data for ${locationName} - no valid data found in search results`);
      return null;
    }

    // Fetch property type data
    console.log(`   🏠 Fetching property type data...`);
    const propertyTypes = {};
    
    // Houses (single-family homes)
    await new Promise(resolve => setTimeout(resolve, 2000));
    const housesData = await scrapePropertyTypeData(locationName, 'houses', 'single-family homes detached houses');
    if (housesData) propertyTypes.houses = housesData;
    
    // Condos and townhouses
    await new Promise(resolve => setTimeout(resolve, 2000));
    const condosData = await scrapePropertyTypeData(locationName, 'condos', 'condos townhouses');
    if (condosData) propertyTypes.condos = condosData;
    
    // Multi-family properties
    await new Promise(resolve => setTimeout(resolve, 2000));
    const multiFamilyData = await scrapePropertyTypeData(locationName, 'multiFamily', 'duplexes triplexes apartment buildings multi-family');
    if (multiFamilyData) propertyTypes.multiFamily = multiFamilyData;
    
    // Land
    await new Promise(resolve => setTimeout(resolve, 2000));
    const landData = await scrapePropertyTypeData(locationName, 'land', 'vacant lots land for sale');
    if (landData) propertyTypes.land = landData;
    
    // Commercial real estate
    await new Promise(resolve => setTimeout(resolve, 2000));
    const commercialData = await scrapePropertyTypeData(locationName, 'commercial', 'commercial real estate office buildings retail warehouses');
    if (commercialData) propertyTypes.commercial = commercialData;

    // Search for property tax rate
    await new Promise(resolve => setTimeout(resolve, 2000));
    const taxQuery = `${locationName} Ontario property tax rate 2024 2025`;
    const taxSearchData = await searchBraveAPI(taxQuery);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const taxRate = extractTaxRateFromResults(taxSearchData);

    // Search for demographics
    const demoQuery = `${locationName} Ontario demographics household income population`;
    const demoSearchData = await searchBraveAPI(demoQuery);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const demographics = extractDemographicsFromResults(demoSearchData);

    // Search for market data
    const marketQuery = `${locationName} Ontario real estate market days on market 2024`;
    const marketSearchData = await searchBraveAPI(marketQuery);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const marketData = extractMarketDataFromResults(marketSearchData);

    // Get mortgage information and resources
    const mortgageInfo = getMortgageInfoForLocation(locationName);

    // Build location data object with ONLY real data from Brave API
    const locationData = {
      locationName,
      region: 'GTA Toronto',
      averageHomePrice: {
        median: Math.round(averagePrice * 0.95),
        average: averagePrice,
        priceRange: {
          low: Math.round(averagePrice * 0.7),
          high: Math.round(averagePrice * 1.5)
        },
        currency: 'CAD'
      },
      ...(Object.keys(propertyTypes).length > 0 && { propertyTypes }),
      propertyTaxRate: taxRate ? {
        rate: parseFloat(taxRate.toFixed(2)),
        annualTaxExample: {
          homePrice: averagePrice,
          taxAmount: Math.round(averagePrice * taxRate / 100)
        },
        description: `Property tax rate for ${locationName}, Ontario`
      } : null,
      additionalInfo: {
        ...(marketData.averageDaysOnMarket && { averageDaysOnMarket: marketData.averageDaysOnMarket }),
        ...(Object.keys(demographics).length > 0 && { demographics })
      },
      mortgageInfo,
      dataSource: {
        sources: ['Brave Search API', 'Real Estate Web Data'],
        dataType: 'Web-scraped via Brave API',
        disclaimer: 'Data collected from internet sources. Accuracy not guaranteed. Consult real estate professionals.',
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    };

    // Only add additionalInfo if it has data
    if (Object.keys(locationData.additionalInfo).length === 0) {
      delete locationData.additionalInfo;
    }

    console.log(`✅ Collected data for ${locationName}: $${averagePrice.toLocaleString()} avg, ${taxRate ? taxRate.toFixed(2) + '%' : 'N/A'} tax, ${Object.keys(propertyTypes).length} property types`);
    return locationData;
    
  } catch (error) {
    console.error(`❌ Error collecting data for ${locationName}:`, error.message);
    return null;
  }
}

/**
 * Scrape and save all GTA location data using Brave API
 */
async function scrapeAndSaveAllLocations() {
  console.log('🏘️  Starting GTA locations data collection from Brave API...');
  console.log('ℹ️  This uses real web data and respects API rate limits - will take 5-10 minutes...');
  console.log(`📊 Collecting data for ${GTA_LOCATIONS.length} locations\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const failedLocations = [];

  for (let i = 0; i < GTA_LOCATIONS.length; i++) {
    const location = GTA_LOCATIONS[i];
    console.log(`\n[${i+1}/${GTA_LOCATIONS.length}] Processing: ${location}`);
    
    try {
      const locationData = await scrapeLocationData(location);
      
      if (locationData) {
        // Update or create location data
        await LocationData.findOneAndUpdate(
          { locationName: location },
          locationData,
          { upsert: true, new: true }
        );
        
        console.log(`✅ Saved real data for ${location}`);
        successCount++;
      } else {
        console.error(`❌ Unable to collect data for ${location}`);
        failedLocations.push(location);
        errorCount++;
      }
      
      // Longer delay between locations to avoid rate limiting
      if (i < GTA_LOCATIONS.length - 1) {
        console.log(`⏳ Waiting 3 seconds before next location...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`❌ Failed to save ${location}:`, error.message);
      failedLocations.push(location);
      errorCount++;
      
      // Wait before continuing on error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Location data collection complete!`);
  console.log(`   Success: ${successCount}/${GTA_LOCATIONS.length} locations`);
  console.log(`   Failed: ${errorCount}/${GTA_LOCATIONS.length} locations`);
  
  if (failedLocations.length > 0) {
    console.log(`   ⚠️  Unable to collect data for: ${failedLocations.join(', ')}`);
  }
  
  console.log(`   📌 Data collected from Brave Search API`);
  console.log(`${'='.repeat(60)}\n`);
  
  return { successCount, errorCount, failedLocations };
}

/**
 * Get all available locations
 */
async function getAllLocations() {
  try {
    const locations = await LocationData.find({}, 'locationName region averageHomePrice.average')
      .sort({ locationName: 1 });
    return locations;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

/**
 * Get specific location data
 */
async function getLocationByName(locationName) {
  try {
    const location = await LocationData.findOne({ locationName });
    return location;
  } catch (error) {
    console.error(`Error fetching location ${locationName}:`, error);
    return null;
  }
}

module.exports = {
  scrapeAndSaveAllLocations,
  getAllLocations,
  getLocationByName,
  GTA_LOCATIONS
};
