const axios = require('axios');
const EconomicData = require('../models/EconomicData');

// Bank of Canada Valet API base URL
const VALET_API_BASE = 'https://www.bankofcanada.ca/valet/observations';

// Fetch data from Bank of Canada Valet API
async function fetchValetData(seriesCode) {
  try {
    const url = `${VALET_API_BASE}/${seriesCode}/json?recent=1`;
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.observations && response.data.observations.length > 0) {
      const observation = response.data.observations[0];
      const value = parseFloat(observation[seriesCode].v);
      const date = observation.d;
      return { value, date };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${seriesCode}:`, error.message);
    return null;
  }
}

// Scraper for Bank of Canada Policy Interest Rate
async function scrapeBankOfCanada() {
  try {
    console.log('📡 Fetching Bank of Canada Policy Rate from Valet API...');
    
    // V39079 = Policy Interest Rate (Bank Rate)
    const data = await fetchValetData('V39079');
    
    if (data) {
      console.log(`✅ BoC Rate: ${data.value}% (as of ${data.date})`);
      return {
        centralBankRate: {
          rate: data.value,
          date: new Date(data.date),
          source: 'Bank of Canada Valet API',
          description: 'Policy Interest Rate'
        }
      };
    }
    
    throw new Error('No data returned from API');
  } catch (error) {
    console.error('❌ Error fetching BoC rate:', error.message);
    throw new Error('Failed to fetch Bank of Canada rate - no fallback available');
  }
}

// Scraper for Canadian inflation data (CPI)
async function scrapeInflationData() {
  try {
    console.log('📡 Fetching Inflation Rate from Statistics Canada...');
    
    // Get CPI index for last 13 months to calculate year-over-year change
    const statCanUrl = 'https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods';
    const payload = [{
      vectorId: 41690973, // Consumer Price Index, All-items, Canada
      latestN: 13 // Need 13 months to calculate YoY change
    }];
    
    const response = await axios.post(statCanUrl, payload, { 
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data && response.data[0]?.object?.vectorDataPoint?.length >= 13) {
      const dataPoints = response.data[0].object.vectorDataPoint;
      const current = parseFloat(dataPoints[0].value); // Most recent CPI
      const yearAgo = parseFloat(dataPoints[12].value); // CPI 12 months ago
      const inflationRate = ((current - yearAgo) / yearAgo) * 100;
      const date = dataPoints[0].refPer;
      
      console.log(`✅ Inflation Rate: ${inflationRate.toFixed(1)}% (as of ${date})`);
      console.log(`   CPI: ${current.toFixed(1)} (vs ${yearAgo.toFixed(1)} year ago)`);
      
      return {
        inflation: {
          rate: parseFloat(inflationRate.toFixed(1)),
          date: new Date(date),
          source: 'Statistics Canada (calculated from CPI)',
          description: 'Year-over-year inflation rate',
          cpiCurrent: current,
          cpiYearAgo: yearAgo
        }
      };
    }
    
    throw new Error('Insufficient CPI data from Statistics Canada');
  } catch (error) {
    console.error('❌ Error fetching inflation data:', error.message);
    throw new Error('Failed to fetch inflation data - no fallback available');
  }
}

// Scraper for GDP growth data from Statistics Canada
async function scrapeGDPData() {
  try {
    console.log('📡 Fetching GDP Growth from Statistics Canada...');
    
    // Get Real GDP for last 5 quarters to calculate growth rate
    const statCanUrl = 'https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods';
    const payload = [{
      vectorId: 65201210, // Real GDP at market prices (chained 2017 dollars)
      latestN: 5 // Need multiple quarters to calculate growth
    }];
    
    const response = await axios.post(statCanUrl, payload, { 
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data && response.data[0]?.object?.vectorDataPoint?.length >= 2) {
      const dataPoints = response.data[0].object.vectorDataPoint;
      const current = parseFloat(dataPoints[0].value); // Most recent GDP
      const previous = parseFloat(dataPoints[1].value); // Previous quarter GDP
      const growthRate = ((current - previous) / previous) * 100;
      const date = dataPoints[0].refPer;
      
      console.log(`✅ GDP Growth: ${growthRate}% (as of ${date})`);
      console.log(`   Real GDP: $${(current/1000).toFixed(1)}B (vs $${(previous/1000).toFixed(1)}B previous quarter)`);
      
      return {
        gdpGrowth: {
          rate: growthRate, // Keep full precision, don't round
          date: new Date(date),
          source: 'Statistics Canada (calculated from Real GDP)',
          description: 'Real GDP growth, quarter-over-quarter percentage change',
          gdpCurrent: current,
          gdpPrevious: previous
        }
      };
    }
    
    throw new Error('Insufficient GDP data from Statistics Canada');
  } catch (error) {
    console.error('❌ Error fetching GDP data:', error.message);
    throw new Error('Failed to fetch GDP data - no fallback available');
  }
}

// Scraper for 10-Year Government Bond Yield
async function scrapeBondYieldData() {
  try {
    console.log('📡 Fetching 10-Year Bond Yield from Valet API...');
    
    // V122531 = Government of Canada benchmark bond yields - 10 year
    const data = await fetchValetData('V122531');
    
    if (data) {
      console.log(`✅ 10-Year Bond: ${data.value}% (as of ${data.date})`);
      return {
        bondYield: {
          tenYear: data.value,
          date: new Date(data.date),
          source: 'Bank of Canada Valet API'
        }
      };
    }
    
    throw new Error('No bond yield data returned');
  } catch (error) {
    console.error('❌ Error fetching bond yield:', error.message);
    throw new Error('Failed to fetch bond yield data - no fallback available');
  }
}

// Main function to scrape all data and save to MongoDB
// This should only be called once per day by the cron job
async function scrapeAndSaveEconomicData() {
  try {
    console.log('🔄 Starting economic data update from Bank of Canada...');
    console.log('⏰ Current time:', new Date().toISOString());
    
    // Check if we already updated today
    const existingData = await EconomicData.findOne({ country: 'Canada' });
    if (existingData && existingData.lastUpdated) {
      const lastUpdate = new Date(existingData.lastUpdated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 23) {
        console.log(`⏭️  Skipping update - data was updated ${hoursSinceUpdate.toFixed(1)} hours ago`);
        console.log('📊 Using existing economic data from database');
        return existingData;
      }
    }
    
    console.log('📡 Fetching fresh economic data from Bank of Canada Valet API...');
    
    // Scrape all data sources in parallel
    const [bankData, inflationData, gdpData, bondData] = await Promise.all([
      scrapeBankOfCanada(),
      scrapeInflationData(),
      scrapeGDPData(),
      scrapeBondYieldData()
    ]);

    // Combine all data
    const economicData = {
      country: 'Canada',
      ...bankData,
      ...inflationData,
      ...gdpData,
      ...bondData,
      lastUpdated: new Date(),
      scrapedAt: new Date()
    };

    // Save to MongoDB (update if exists, create if not)
    const result = await EconomicData.findOneAndUpdate(
      { country: 'Canada' },
      economicData,
      { upsert: true, new: true }
    );

    console.log('✅ Economic data saved successfully to database');
    console.log('📍 All indicators fetched from Bank of Canada Valet API');
    console.log('💾 Database updated at:', result.lastUpdated.toISOString());
    
    return result;
  } catch (error) {
    console.error('❌ Error in scrapeAndSaveEconomicData:', error.message);
    throw error;
  }
}

module.exports = {
  scrapeAndSaveEconomicData,
  scrapeBankOfCanada,
  scrapeInflationData,
  scrapeGDPData,
  scrapeBondYieldData
};
