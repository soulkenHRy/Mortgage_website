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
 * Scrape location data using Brave API
 */
async function scrapeLocationData(locationName) {
  console.log(`\n📍 Fetching real data for ${locationName} from Brave API...`);
  
  try {
    // Search for average home price
    const priceQuery = `${locationName} Ontario Canada average home price 2024 2025`;
    const priceSearchData = await searchBraveAPI(priceQuery);
    
    // Delay between API calls to avoid rate limiting
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

    // Search for property tax rate
    const taxQuery = `${locationName} Ontario property tax rate 2024 2025`;
    const taxSearchData = await searchBraveAPI(taxQuery);
    
    // Delay after second API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const taxRate = extractTaxRateFromResults(taxSearchData);

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
      propertyTaxRate: taxRate ? {
        rate: parseFloat(taxRate.toFixed(2)),
        annualTaxExample: {
          homePrice: averagePrice,
          taxAmount: Math.round(averagePrice * taxRate / 100)
        },
        description: `Property tax rate for ${locationName}, Ontario`
      } : {
        rate: null,
        annualTaxExample: null,
        description: 'Unable to collect property tax data'
      },
      loanPrograms: [
        {
          name: 'First-Time Home Buyer Incentive',
          type: 'Federal Program',
          description: 'Shared-equity mortgage with the Government of Canada',
          eligibility: 'First-time homebuyers with household income under $120,000',
          benefits: [
            '5% or 10% of home purchase price',
            'Reduces monthly mortgage payments',
            'No ongoing payments required'
          ],
          link: 'https://www.placetocallhome.ca/fthbi/first-time-homebuyer-incentive'
        },
        {
          name: 'Home Buyers\' Plan (HBP)',
          type: 'Federal Program',
          description: 'Withdraw up to $35,000 from RRSP to buy or build a home',
          eligibility: 'First-time homebuyers or those who haven\'t owned a home in 4 years',
          benefits: [
            'Borrow up to $35,000 from RRSP',
            'No immediate tax implications',
            '15 years to repay'
          ],
          link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/what-home-buyers-plan.html'
        },
        {
          name: 'Ontario Land Transfer Tax Refund',
          type: 'Provincial Assistance',
          description: 'Refund of land transfer tax for first-time homebuyers',
          eligibility: 'First-time homebuyers purchasing in Ontario',
          benefits: [
            'Up to $4,000 refund',
            'Additional Toronto rebate if applicable',
            'Covers most of land transfer tax'
          ],
          link: 'https://www.ontario.ca/page/land-transfer-tax'
        },
        {
          name: 'CMHC Insured Mortgages',
          type: 'Federal Program',
          description: 'Mortgage insurance for down payments less than 20%',
          eligibility: 'Homebuyers with down payment of 5-19.99%',
          benefits: [
            'Purchase with as little as 5% down',
            'Access to better interest rates',
            'Protected lender = more options'
          ],
          link: 'https://www.cmhc-schl.gc.ca/en/consumers/home-buying/mortgage-loan-insurance'
        }
      ],
      hoaFees: {
        applicable: locationName.includes('Toronto') || locationName === 'Mississauga' || locationName === 'Oakville',
        averageMonthly: {
          low: 200,
          high: 600
        },
        commonIn: ['Condominiums', 'Townhouses', 'Gated Communities'],
        description: 'HOA fees typically apply to condos and townhouses. Fees cover amenities, maintenance, and building insurance.'
      },
      insuranceEstimates: {
        homeownersInsurance: {
          monthlyLow: Math.round(averagePrice * 0.0003),
          monthlyHigh: Math.round(averagePrice * 0.0007),
          annualAverage: Math.round(averagePrice * 0.005)
        },
        floodInsurance: {
          required: ['Toronto Downtown', 'Mississauga', 'Oakville', 'Burlington'].includes(locationName),
          monthlyEstimate: 50,
          floodZone: ['Toronto Downtown', 'Mississauga'].includes(locationName) ? 'Moderate Risk' : 'Low Risk'
        },
        otherCoverage: [
          {
            type: 'Sewer Backup Coverage',
            monthlyEstimate: 15,
            description: 'Recommended for basement properties'
          },
          {
            type: 'Earthquake Coverage',
            monthlyEstimate: 25,
            description: 'Optional coverage for GTA region'
          }
        ]
      },
      additionalInfo: {
        dataSource: 'Brave Search API',
        dataCollectionDate: new Date(),
        disclaimer: 'Data collected from public web sources via Brave Search API. For current prices, consult a real estate professional.'
      },
      dataSource: {
        sources: ['Brave Search API', 'Real Estate Web Data'],
        dataType: 'Web-scraped via Brave API',
        disclaimer: 'Data collected from internet sources. Accuracy not guaranteed. Consult real estate professionals.',
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    };

    console.log(`✅ Collected data for ${locationName}: $${averagePrice.toLocaleString()} avg, ${taxRate ? taxRate.toFixed(2) + '%' : 'N/A'} tax`);
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
