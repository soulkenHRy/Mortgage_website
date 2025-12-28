const axios = require('axios');
const mongoose = require('mongoose');
const MortgageRate = require('../models/MortgageRate');

// Brave Search API Configuration
const BRAVE_API_KEY = 'BSArZidfgMExpZ13UaoIuqtK4bZR52y';
const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// Helper function to calculate monthly payment per $100k
function calculatePaymentPerHundredK(annualRate, years) {
  if (!annualRate || annualRate === 0) return null;

  const principal = 100000;
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;

  if (monthlyRate === 0) return principal / numberOfPayments;

  const payment = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return Math.round(payment * 100) / 100;
}

// Search Brave API
async function searchBraveAPI(query) {
  try {
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
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error searching Brave API:`, error.message);
    return null;
  }
}

// Extract rates from search results
function extractRatesFromResults(searchData, rateType) {
  if (!searchData || !searchData.web || !searchData.web.results) {
    return null;
  }

  const results = searchData.web.results;
  let rates = [];

  for (const result of results) {
    const text = `${result.title} ${result.description}`.toLowerCase();
    
    // Look for rate patterns like "4.09%", "5.45%", etc.
    const ratePatterns = [
      /(\d+\.\d+)%/g,
      /(\d+\.\d+)\s*percent/gi
    ];

    for (const pattern of ratePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const rate = parseFloat(match.replace(/[^\d.]/g, ''));
          // Canadian mortgage rates typically range from 2% to 8%
          if (rate >= 2.0 && rate <= 8.0) {
            rates.push(rate);
          }
        });
      }
    }
  }

  if (rates.length === 0) {
    return null;
  }

  // Return median of found rates to avoid outliers
  rates.sort((a, b) => a - b);
  const median = rates[Math.floor(rates.length / 2)];
  return parseFloat(median.toFixed(2));
}

// Fetch mortgage rates using Brave API
async function fetchMortgageRates() {
  try {
    console.log('🔍 Fetching mortgage rates using Brave API...');
    
    let bankRate = null;
    let primeRate = null;
    let variableRate = null;
    let fiveYearInsured = null;
    let fiveYearUninsured = null;

    // 1. Get Bank of Canada rate from Valet API
    try {
      console.log('📊 Fetching Bank of Canada rate...');
      const bocResponse = await axios.get('https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1', {
        timeout: 10000
      });
      
      if (bocResponse.data && bocResponse.data.observations && bocResponse.data.observations.length > 0) {
        bankRate = parseFloat(bocResponse.data.observations[0].V39079.v);
        console.log(`   ✅ Bank Rate: ${bankRate}%`);
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch Bank of Canada rate:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Search for Prime Rate
    console.log('📊 Searching for Prime Rate...');
    const primeSearchData = await searchBraveAPI('Canada prime rate 2024 2025 current');
    primeRate = extractRatesFromResults(primeSearchData, 'prime');
    if (primeRate) {
      console.log(`   ✅ Prime Rate: ${primeRate}%`);
    } else {
      console.log('   ⚠️  Could not find Prime Rate');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Search for Variable Rate
    console.log('📊 Searching for Variable Mortgage Rate...');
    const variableSearchData = await searchBraveAPI('Canada variable mortgage rate 2024 2025 current');
    variableRate = extractRatesFromResults(variableSearchData, 'variable');
    if (variableRate) {
      console.log(`   ✅ Variable Rate: ${variableRate}%`);
    } else {
      console.log('   ⚠️  Could not find Variable Rate');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Search for 5-Year Fixed Insured
    console.log('📊 Searching for 5-Year Fixed Insured Rate...');
    const insuredSearchData = await searchBraveAPI('Canada 5 year fixed insured mortgage rate 2024 2025');
    fiveYearInsured = extractRatesFromResults(insuredSearchData, '5-year-insured');
    if (fiveYearInsured) {
      console.log(`   ✅ 5-Year Fixed Insured: ${fiveYearInsured}%`);
    } else {
      console.log('   ⚠️  Could not find 5-Year Fixed Insured Rate');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. Search for 5-Year Fixed Uninsured
    console.log('📊 Searching for 5-Year Fixed Uninsured Rate...');
    const uninsuredSearchData = await searchBraveAPI('Canada 5 year fixed uninsured mortgage rate 2024 2025');
    fiveYearUninsured = extractRatesFromResults(uninsuredSearchData, '5-year-uninsured');
    if (fiveYearUninsured) {
      console.log(`   ✅ 5-Year Fixed Uninsured: ${fiveYearUninsured}%`);
    } else {
      console.log('   ⚠️  Could not find 5-Year Fixed Uninsured Rate');
    }

    // 6-14. Search for all other fixed term rates (1, 2, 3, 4, 6, 7, 8, 9, 10 years)
    const fixedRatesData = {
      oneYear: null,
      twoYear: null,
      threeYear: null,
      fourYear: null,
      fiveYear: fiveYearInsured || fiveYearUninsured, // Use either insured or uninsured as general 5-year
      sixYear: null,
      sevenYear: null,
      eightYear: null,
      nineYear: null,
      tenYear: null
    };

    const terms = [
      { key: 'oneYear', name: '1-year', query: 'Canada 1 year fixed mortgage rate 2024 2025' },
      { key: 'twoYear', name: '2-year', query: 'Canada 2 year fixed mortgage rate 2024 2025' },
      { key: 'threeYear', name: '3-year', query: 'Canada 3 year fixed mortgage rate 2024 2025' },
      { key: 'fourYear', name: '4-year', query: 'Canada 4 year fixed mortgage rate 2024 2025' },
      { key: 'sixYear', name: '6-year', query: 'Canada 6 year fixed mortgage rate 2024 2025' },
      { key: 'sevenYear', name: '7-year', query: 'Canada 7 year fixed mortgage rate 2024 2025' },
      { key: 'eightYear', name: '8-year', query: 'Canada 8 year fixed mortgage rate 2024 2025' },
      { key: 'nineYear', name: '9-year', query: 'Canada 9 year fixed mortgage rate 2024 2025' },
      { key: 'tenYear', name: '10-year', query: 'Canada 10 year fixed mortgage rate 2024 2025' }
    ];

    for (const term of terms) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`📊 Searching for ${term.name} Fixed Rate...`);
      const termSearchData = await searchBraveAPI(term.query);
      const rate = extractRatesFromResults(termSearchData, term.name);
      if (rate) {
        fixedRatesData[term.key] = rate;
        console.log(`   ✅ ${term.name} Fixed: ${rate}%`);
      } else {
        console.log(`   ⚠️  Could not find ${term.name} Fixed Rate`);
      }
    }

    // Calculate payments per $100k for each rate found
    const paymentsData = {
      oneYear: fixedRatesData.oneYear ? calculatePaymentPerHundredK(fixedRatesData.oneYear, 1) : null,
      twoYear: fixedRatesData.twoYear ? calculatePaymentPerHundredK(fixedRatesData.twoYear, 2) : null,
      threeYear: fixedRatesData.threeYear ? calculatePaymentPerHundredK(fixedRatesData.threeYear, 3) : null,
      fourYear: fixedRatesData.fourYear ? calculatePaymentPerHundredK(fixedRatesData.fourYear, 4) : null,
      fiveYear: fixedRatesData.fiveYear ? calculatePaymentPerHundredK(fixedRatesData.fiveYear, 5) : null,
      sixYear: fixedRatesData.sixYear ? calculatePaymentPerHundredK(fixedRatesData.sixYear, 6) : null,
      sevenYear: fixedRatesData.sevenYear ? calculatePaymentPerHundredK(fixedRatesData.sevenYear, 7) : null,
      eightYear: fixedRatesData.eightYear ? calculatePaymentPerHundredK(fixedRatesData.eightYear, 8) : null,
      nineYear: fixedRatesData.nineYear ? calculatePaymentPerHundredK(fixedRatesData.nineYear, 9) : null,
      tenYear: fixedRatesData.tenYear ? calculatePaymentPerHundredK(fixedRatesData.tenYear, 10) : null
    };

    // Return only the data we actually found
    const rates = {
      bankRate: bankRate,
      currentPrimeRate: primeRate,
      currentVariableRate: variableRate,
      insuredRates: fiveYearInsured ? { fiveYearFixed: fiveYearInsured } : null,
      uninsuredRates: fiveYearUninsured ? { fiveYearFixed: fiveYearUninsured } : null,
      fixedRates: fixedRatesData,
      paymentsPerHundredK: paymentsData,
      scrapedSuccessfully: !!(primeRate || variableRate || fiveYearInsured || fiveYearUninsured || 
                              fixedRatesData.oneYear || fixedRatesData.twoYear || fixedRatesData.threeYear)
    };

    console.log('\n📊 Summary of fetched rates:');
    console.log('   Bank Rate:', bankRate ? `${bankRate}%` : 'Not available');
    console.log('   Prime Rate:', primeRate ? `${primeRate}%` : 'Not available');
    console.log('   Variable Rate:', variableRate ? `${variableRate}%` : 'Not available');
    console.log('   5-Year Fixed Insured:', fiveYearInsured ? `${fiveYearInsured}%` : 'Not available');
    console.log('   5-Year Fixed Uninsured:', fiveYearUninsured ? `${fiveYearUninsured}%` : 'Not available');
    console.log('   1-Year Fixed:', fixedRatesData.oneYear ? `${fixedRatesData.oneYear}%` : 'Not available');
    console.log('   2-Year Fixed:', fixedRatesData.twoYear ? `${fixedRatesData.twoYear}%` : 'Not available');
    console.log('   3-Year Fixed:', fixedRatesData.threeYear ? `${fixedRatesData.threeYear}%` : 'Not available');
    console.log('   4-Year Fixed:', fixedRatesData.fourYear ? `${fixedRatesData.fourYear}%` : 'Not available');
    console.log('   6-Year Fixed:', fixedRatesData.sixYear ? `${fixedRatesData.sixYear}%` : 'Not available');
    console.log('   7-Year Fixed:', fixedRatesData.sevenYear ? `${fixedRatesData.sevenYear}%` : 'Not available');
    console.log('   8-Year Fixed:', fixedRatesData.eightYear ? `${fixedRatesData.eightYear}%` : 'Not available');
    console.log('   9-Year Fixed:', fixedRatesData.nineYear ? `${fixedRatesData.nineYear}%` : 'Not available');
    console.log('   10-Year Fixed:', fixedRatesData.tenYear ? `${fixedRatesData.tenYear}%` : 'Not available');

    return rates;
  } catch (error) {
    console.error('❌ Error fetching mortgage rates:', error.message);
    
    // Return empty structure - no fallback hardcoded values
    return {
      bankRate: null,
      currentPrimeRate: null,
      currentVariableRate: null,
      insuredRates: null,
      uninsuredRates: null,
      fixedRates: null,
      paymentsPerHundredK: null,
      scrapedSuccessfully: false
    };
  }
}

// Main function to scrape and save mortgage rates to MongoDB
async function scrapeAndSaveMortgageRates() {
  try {
    console.log('🔄 Starting mortgage rate update...');
    console.log('⏰ Current time:', new Date().toISOString());

    // Check if we already updated recently
    const existingRates = await MortgageRate.findOne({ country: 'Canada' });
    if (existingRates && existingRates.lastUpdated) {
      const lastUpdate = new Date(existingRates.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 23) {
        console.log(`⏭️  Skipping update - rates were updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
        console.log('📊 Using existing rates from database');
        return existingRates;
      }
    }

    console.log('📡 Fetching rates using Brave Search API...');
    
    // Fetch rates
    const ratesData = await fetchMortgageRates();

    // Prepare data for database - only include fields that have data
    const mortgageData = {
      country: 'Canada',
      source: ratesData.scrapedSuccessfully ? 'Brave Search API / Bank of Canada' : 'Data unavailable',
      lastUpdated: new Date(),
      scrapedAt: new Date(),
      scrapedSuccessfully: ratesData.scrapedSuccessfully
    };

    // Only add fields if they have actual data
    if (ratesData.bankRate !== null) {
      mortgageData.bankRate = ratesData.bankRate;
    }
    if (ratesData.currentPrimeRate !== null) {
      mortgageData.currentPrimeRate = ratesData.currentPrimeRate;
    }
    if (ratesData.currentVariableRate !== null) {
      mortgageData.currentVariableRate = ratesData.currentVariableRate;
    }
    if (ratesData.insuredRates !== null) {
      mortgageData.insuredRates = ratesData.insuredRates;
    }
    if (ratesData.uninsuredRates !== null) {
      mortgageData.uninsuredRates = ratesData.uninsuredRates;
    }
    if (ratesData.fixedRates) {
      mortgageData.fixedRates = ratesData.fixedRates;
    }
    if (ratesData.paymentsPerHundredK) {
      mortgageData.paymentsPerHundredK = ratesData.paymentsPerHundredK;
    }

    // Save to MongoDB (update if exists, create if not)
    const result = await MortgageRate.findOneAndUpdate(
      { country: 'Canada' },
      mortgageData,
      { upsert: true, new: true }
    );

    console.log('✅ Mortgage rates saved successfully to database');
    console.log('📍 Data source:', result.source);
    console.log('🔗 Fetch successful:', result.scrapedSuccessfully);
    console.log('💾 Database updated at:', result.lastUpdated.toISOString());

    return result;
  } catch (error) {
    console.error('❌ Error in scrapeAndSaveMortgageRates:', error.message);
    throw error;
  }
}

module.exports = {
  scrapeAndSaveMortgageRates,
  fetchMortgageRates,
  calculatePaymentPerHundredK
};

// Run the scraper if this file is executed directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortgage-calculator';
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('✅ Connected to MongoDB');
      return scrapeAndSaveMortgageRates();
    })
    .then(() => {
      console.log('✅ Script completed successfully');
      return mongoose.connection.close();
    })
    .then(() => {
      console.log('🔌 Database connection closed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      mongoose.connection.close().then(() => process.exit(1));
    });
}
