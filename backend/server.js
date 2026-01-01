const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const EconomicData = require('./models/EconomicData');
const Feedback = require('./models/Feedback');
const User = require('./models/User');
const { scrapeAndSaveEconomicData } = require('./scrapers/economicDataScraper');
const UserData = require('./models/UserData');
const TeamMember = require('./models/TeamMember');
const Appointment = require('./models/Appointment');
const MortgageRate = require('./models/MortgageRate');
const { scrapeAndSaveMortgageRates } = require('./scrapers/mortgageRateScraper');
const LocationData = require('./models/LocationData');
const { scrapeAndSaveAllLocations, getAllLocations, getLocationByName } = require('./scrapers/locationDataScraper');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in .env file!');
}

// Sendgrid Email Configuration (HTTP-based, works on Railway)
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ Sendgrid email service configured');
  console.log(`📧 Emails will be sent from: ${FROM_EMAIL}`);
} else {
  console.warn('⚠️  WARNING: SENDGRID_API_KEY not set. Email service disabled.');
  console.log('   Get your free API key at: https://sendgrid.com');
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortgage-calculator';

mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Initialize economic data
  scrapeAndSaveEconomicData()
    .then(() => console.log('✅ Economic data ready'))
    .catch(err => console.error('❌ Initial scrape error:', err.message));

  // Initialize mortgage rates
  scrapeAndSaveMortgageRates()
    .then(() => console.log('✅ Mortgage rates ready'))
    .catch(err => console.error('❌ Mortgage rates scrape error:', err.message));

  // Initialize location data (will check last update internally)
  try {
    const locationCount = await LocationData.countDocuments();
    if (locationCount === 0) {
      console.log('🏘️  No location data found, initializing...');
      scrapeAndSaveAllLocations()
        .then(() => console.log('✅ Location data ready'))
        .catch(err => console.error('❌ Location data error:', err.message));
    } else {
      console.log(`✅ Location data already exists (${locationCount} locations)`);
      console.log('💡 Use POST /api/locations/refresh to update property types');
    }
  } catch (err) {
    console.error('❌ Location check error:', err.message);
  }
})
.catch(err => console.error('❌ MongoDB connection error:', err));

cron.schedule('0 9 * * 0', () => {
  console.log('⏰ Weekly data refresh started (every Sunday at 9:00 AM)');
  
  scrapeAndSaveEconomicData()
    .then(() => console.log('✅ Economic data updated'))
    .catch(err => console.error('❌ Economic data error:', err.message));

  scrapeAndSaveMortgageRates()
    .then(() => console.log('✅ Mortgage rates updated'))
    .catch(err => console.error('❌ Mortgage rates error:', err.message));

  scrapeAndSaveAllLocations()
    .then(() => console.log('✅ Location data updated'))
    .catch(err => console.error('❌ Location data error:', err.message));
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://mortgage-website-rho.vercel.app',
  'https://mortgage-website-nkqsyfxir-shakens-projects-5f9cdaf4.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.set('trust proxy', 1);
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireVerification = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token provided' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false, 
        error: 'Please verify your email before using this feature',
        requiresVerification: true
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// Mortgage calculation endpoint
app.post('/api/calculate-mortgage', (req, res) => {
  try {
    const {
      propertyPrice,
      downPayment,
      loanAmount,
      interestRate,
      loanTerm,
      propertyTax,
      insurance,
      hoaFees
    } = req.body;

    // Validation
    if (!interestRate || !loanTerm) {
      return res.status(400).json({ 
        error: 'Interest rate and loan term are required' 
      });
    }

    // Determine the principal (loan amount)
    let principal = parseFloat(loanAmount) || 0;
    
    // If loan amount is not provided, calculate from property price and down payment
    if (!principal && propertyPrice && downPayment) {
      principal = parseFloat(propertyPrice) - parseFloat(downPayment);
    }

    const rate = parseFloat(interestRate) / 100 / 12; // Monthly interest rate
    const numberOfPayments = parseFloat(loanTerm) * 12; // Total number of monthly payments
    const tax = parseFloat(propertyTax) || 0;
    const insuranceCost = parseFloat(insurance) || 0;
    const hoa = parseFloat(hoaFees) || 0;

    if (principal <= 0 || rate <= 0 || numberOfPayments <= 0) {
      return res.status(400).json({ 
        error: 'Please enter valid values for loan amount, interest rate, and loan term' 
      });
    }

    // Calculate monthly mortgage payment (principal + interest)
    // Formula: M = P [ r(1 + r)^n ] / [ (1 + r)^n - 1 ]
    const monthlyPayment = 
      (principal * rate * Math.pow(1 + rate, numberOfPayments)) /
      (Math.pow(1 + rate, numberOfPayments) - 1);

    // Calculate total amount paid over the life of the loan
    const totalPaid = monthlyPayment * numberOfPayments;

    // Calculate total interest paid
    const totalInterest = totalPaid - principal;

    // Calculate first month's breakdown
    const firstMonthInterest = principal * rate;
    const firstMonthPrincipal = monthlyPayment - firstMonthInterest;

    // Calculate total monthly payment including additional costs
    const totalMonthlyPayment = monthlyPayment + tax + insuranceCost + hoa;

    // Calculate down payment percentage if property price is provided
    const downPaymentPercent = propertyPrice && downPayment 
      ? (parseFloat(downPayment) / parseFloat(propertyPrice) * 100).toFixed(2)
      : null;

    // Generate amortization schedule
    const amortizationSchedule = [];
    let remainingBalance = principal;
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = remainingBalance * rate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      
      // Ensure remaining balance doesn't go negative due to rounding
      if (remainingBalance < 0) remainingBalance = 0;
      
      amortizationSchedule.push({
        paymentNumber: i,
        payment: monthlyPayment.toFixed(2),
        principal: principalPayment.toFixed(2),
        interest: interestPayment.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2)
      });
    }

    // Send response
    res.json({
      success: true,
      results: {
        monthlyPayment: monthlyPayment.toFixed(2),
        totalMonthlyPayment: totalMonthlyPayment.toFixed(2),
        totalInterest: totalInterest.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        firstMonthPrincipal: firstMonthPrincipal.toFixed(2),
        firstMonthInterest: firstMonthInterest.toFixed(2),
        principal: principal.toFixed(2),
        downPaymentPercent,
        additionalCosts: (tax + insuranceCost + hoa).toFixed(2),
        amortizationSchedule
      }
    });

  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ 
      error: 'An error occurred during calculation',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Mortgage Calculator API is running' });
});

// ===== CANADIAN ECONOMIC DATA ENDPOINTS =====

// Fetch Canadian Inflation Data (from Statistics Canada or World Bank API)
app.get('/api/canada/inflation', async (req, res) => {
  try {
    // Using World Bank API for Canadian CPI (Consumer Price Index)
    const response = await axios.get(
      'https://api.worldbank.org/v2/country/CAN/indicator/FP.CPI.TOTL.ZG?format=json&date=2020:2025&per_page=10'
    );
    
    if (response.data && response.data[1]) {
      const inflationData = response.data[1].map(item => ({
        year: item.date,
        rate: item.value ? parseFloat(item.value).toFixed(2) : 'N/A',
        country: item.country.value
      }));

      res.json({
        success: true,
        data: {
          indicator: 'Inflation Rate (Consumer Price Index)',
          source: 'World Bank',
          country: 'Canada',
          values: inflationData,
          latestYear: inflationData[0]?.year,
          latestRate: inflationData[0]?.rate,
          unit: '% annual change'
        }
      });
    } else {
      res.status(404).json({ error: 'No inflation data available' });
    }
  } catch (error) {
    console.error('Error fetching inflation data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch inflation data',
      message: error.message 
    });
  }
});

// Fetch Bank of Canada Policy Rate
app.get('/api/canada/policy-rate', async (req, res) => {
  try {
    // Using Bank of Canada's Valet API
    const response = await axios.get(
      'https://www.bankofcanada.ca/valet/observations/V39079/json?recent=10'
    );
    
    if (response.data && response.data.observations) {
      const policyRates = response.data.observations.map(item => ({
        date: item.d,
        rate: parseFloat(item.V39079).toFixed(2)
      }));

      res.json({
        success: true,
        data: {
          indicator: 'Bank of Canada Policy Interest Rate',
          source: 'Bank of Canada - Valet API',
          country: 'Canada',
          values: policyRates,
          latestDate: policyRates[policyRates.length - 1]?.date,
          latestRate: policyRates[policyRates.length - 1]?.rate,
          unit: '% per annum'
        }
      });
    } else {
      res.status(404).json({ error: 'No policy rate data available' });
    }
  } catch (error) {
    console.error('Error fetching policy rate:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch policy rate data',
      message: error.message 
    });
  }
});

// Fetch Canadian GDP Growth (Economic Growth and Stability)
app.get('/api/canada/gdp-growth', async (req, res) => {
  try {
    // Using World Bank API for Canadian GDP Growth
    const response = await axios.get(
      'https://api.worldbank.org/v2/country/CAN/indicator/NY.GDP.MKTP.KD.ZG?format=json&date=2018:2025&per_page=10'
    );
    
    if (response.data && response.data[1]) {
      const gdpData = response.data[1].map(item => ({
        year: item.date,
        growthRate: item.value ? parseFloat(item.value).toFixed(2) : 'N/A',
        country: item.country.value
      }));

      res.json({
        success: true,
        data: {
          indicator: 'GDP Growth Rate',
          source: 'World Bank',
          country: 'Canada',
          values: gdpData,
          latestYear: gdpData[0]?.year,
          latestGrowthRate: gdpData[0]?.growthRate,
          unit: '% annual change'
        }
      });
    } else {
      res.status(404).json({ error: 'No GDP data available' });
    }
  } catch (error) {
    console.error('Error fetching GDP data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch GDP growth data',
      message: error.message 
    });
  }
});

// Fetch Canadian Government Bond Yields (10-Year)
app.get('/api/canada/bond-yield', async (req, res) => {
  try {
    // Using Bank of Canada's Valet API for 10-year bond yields
    const response = await axios.get(
      'https://www.bankofcanada.ca/valet/observations/V122544/json?recent=10'
    );
    
    if (response.data && response.data.observations) {
      const bondYields = response.data.observations.map(item => ({
        date: item.d,
        yield: item.V122544 ? parseFloat(item.V122544).toFixed(2) : 'N/A'
      }));

      res.json({
        success: true,
        data: {
          indicator: 'Government of Canada 10-Year Bond Yield',
          source: 'Bank of Canada - Valet API',
          country: 'Canada',
          values: bondYields,
          latestDate: bondYields[bondYields.length - 1]?.date,
          latestYield: bondYields[bondYields.length - 1]?.yield,
          unit: '% per annum'
        }
      });
    } else {
      res.status(404).json({ error: 'No bond yield data available' });
    }
  } catch (error) {
    console.error('Error fetching bond yield data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch bond yield data',
      message: error.message 
    });
  }
});

// Fetch All Canadian Economic Indicators at Once
app.get('/api/canada/economic-overview', async (req, res) => {
  try {
    // Fetch all data in parallel
    const [inflationRes, policyRateRes, gdpRes, bondYieldRes] = await Promise.allSettled([
      axios.get('https://api.worldbank.org/v2/country/CAN/indicator/FP.CPI.TOTL.ZG?format=json&date=2023:2025&per_page=3'),
      axios.get('https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1'),
      axios.get('https://api.worldbank.org/v2/country/CAN/indicator/NY.GDP.MKTP.KD.ZG?format=json&date=2022:2025&per_page=3'),
      axios.get('https://www.bankofcanada.ca/valet/observations/V122544/json?recent=1')
    ]);

    const overview = {
      success: true,
      country: 'Canada',
      lastUpdated: new Date().toISOString(),
      indicators: {}
    };

    // Process Inflation
    if (inflationRes.status === 'fulfilled' && inflationRes.value.data[1]) {
      const latestInflation = inflationRes.value.data[1][0];
      overview.indicators.inflation = {
        name: 'Inflation Rate',
        value: latestInflation.value ? parseFloat(latestInflation.value).toFixed(2) : 'N/A',
        year: latestInflation.date,
        unit: '%',
        source: 'World Bank'
      };
    }

    // Process Policy Rate
    if (policyRateRes.status === 'fulfilled' && policyRateRes.value.data.observations) {
      const latestRate = policyRateRes.value.data.observations[0];
      overview.indicators.policyRate = {
        name: 'Bank of Canada Policy Rate',
        value: latestRate.V39079 ? parseFloat(latestRate.V39079).toFixed(2) : 'N/A',
        date: latestRate.d,
        unit: '%',
        source: 'Bank of Canada'
      };
    }

    // Process GDP Growth
    if (gdpRes.status === 'fulfilled' && gdpRes.value.data[1]) {
      const latestGDP = gdpRes.value.data[1][0];
      overview.indicators.gdpGrowth = {
        name: 'GDP Growth Rate',
        value: latestGDP.value ? parseFloat(latestGDP.value).toFixed(2) : 'N/A',
        year: latestGDP.date,
        unit: '%',
        source: 'World Bank'
      };
    }

    // Process Bond Yield
    if (bondYieldRes.status === 'fulfilled' && bondYieldRes.value.data.observations) {
      const latestBond = bondYieldRes.value.data.observations[0];
      overview.indicators.bondYield = {
        name: '10-Year Government Bond Yield',
        value: latestBond.V122544 ? parseFloat(latestBond.V122544).toFixed(2) : 'N/A',
        date: latestBond.d,
        unit: '%',
        source: 'Bank of Canada'
      };
    }

    res.json(overview);
  } catch (error) {
    console.error('Error fetching economic overview:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch economic overview',
      message: error.message 
    });
  }
});

// ===== NEW ENDPOINTS: MongoDB-based Economic Data with Web Scraping =====

// Get all economic data from MongoDB
app.get('/api/economic-data', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }).sort({ lastUpdated: -1 });
    
    if (!data) {
      return res.status(404).json({ 
        error: 'No economic data found. Triggering initial scrape...',
        message: 'Please try again in a few seconds'
      });
    }
    
    res.json({
      success: true,
      data: data,
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching economic data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch economic data',
      message: error.message 
    });
  }
});

// Get specific indicator: Inflation
app.get('/api/economic-data/inflation', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { inflation: 1, lastUpdated: 1 });
    
    if (!data || !data.inflation) {
      return res.status(404).json({ error: 'Inflation data not found' });
    }
    
    res.json({
      success: true,
      inflation: data.inflation,
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific indicator: Central Bank Rate
app.get('/api/economic-data/central-bank-rate', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { centralBankRate: 1, lastUpdated: 1 });
    
    if (!data || !data.centralBankRate) {
      return res.status(404).json({ error: 'Central bank rate data not found' });
    }
    
    res.json({
      success: true,
      centralBankRate: data.centralBankRate,
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific indicator: GDP Growth
app.get('/api/economic-data/gdp-growth', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { gdpGrowth: 1, lastUpdated: 1 });
    
    if (!data || !data.gdpGrowth) {
      return res.status(404).json({ error: 'GDP growth data not found' });
    }
    
    res.json({
      success: true,
      gdpGrowth: data.gdpGrowth,
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific indicator: Bond Yield
app.get('/api/economic-data/bond-yield', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { bondYield: 1, lastUpdated: 1 });
    
    if (!data || !data.bondYield) {
      return res.status(404).json({ error: 'Bond yield data not found' });
    }
    
    res.json({
      success: true,
      bondYield: data.bondYield,
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger to refresh economic data (admin endpoint)
app.post('/api/economic-data/refresh', async (req, res) => {
  try {
    console.log('Manual refresh triggered for economic data...');
    const result = await scrapeAndSaveEconomicData();

    res.json({
      success: true,
      message: 'Economic data refreshed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error refreshing economic data:', error.message);
    res.status(500).json({
      error: 'Failed to refresh economic data',
      message: error.message
    });
  }
});

// Mortgage rates endpoints
// ⚠️ This endpoint ONLY serves data from database
// Data is fetched from Bank of Canada API once per day at 9 AM
// Frontend always receives cached database data
app.get('/api/mortgage-rates', async (req, res) => {
  try {
    // Fetch rates from database (not from external API)
    const rates = await MortgageRate.findOne({ country: 'Canada' });

    if (!rates) {
      return res.status(404).json({
        success: false,
        error: 'Mortgage rates not found in database. Please wait for daily update.'
      });
    }

    // Log that we're serving from database
    console.log(`📤 Serving mortgage rates from database (Last updated: ${rates.lastUpdated.toISOString()})`);

    res.json({
      success: true,
      rates: {
        bankRate: rates.bankRate,
        fixedRates: rates.fixedRates,
        paymentsPerHundredK: rates.paymentsPerHundredK,
        currentVariableRate: rates.currentVariableRate,
        currentPrimeRate: rates.currentPrimeRate,
        insuredRates: rates.insuredRates,
        uninsuredRates: rates.uninsuredRates,
        scrapedSuccessfully: rates.scrapedSuccessfully || false
      },
      lastUpdated: rates.lastUpdated,
      source: rates.source
    });
  } catch (error) {
    console.error('Error fetching mortgage rates from database:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mortgage rates from database',
      message: error.message
    });
  }
});

// Manual trigger to refresh mortgage rates (admin endpoint)
app.post('/api/mortgage-rates/refresh', async (req, res) => {
  try {
    console.log('Manual refresh triggered for mortgage rates...');
    const result = await scrapeAndSaveMortgageRates();

    res.json({
      success: true,
      message: 'Mortgage rates refreshed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error refreshing mortgage rates:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh mortgage rates',
      message: error.message
    });
  }
});

// Feedback endpoints
app.post('/api/feedback', requireVerification, async (req, res) => {
  try {
    const { username, rating, feedback, date } = req.body;

    // Validation
    if (!username || !rating || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'Username, rating, and feedback are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    // Create new feedback
    const newFeedback = new Feedback({
      username,
      rating,
      feedback,
      date: date || new Date(),
      approved: true // Auto-approve for now
    });

    await newFeedback.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: newFeedback
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save feedback',
      message: error.message
    });
  }
});

// Get all team members
app.get('/api/team-members', async (req, res) => {
  try {
    const teamMembers = await TeamMember.find()
      .sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      data: teamMembers,
      count: teamMembers.length
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team members',
      message: error.message
    });
  }
});

// Create appointment - saves to separate appointments collection
app.post('/api/appointments', requireVerification, async (req, res) => {
  try {
    const { teamMemberId, userName, userEmail, userPhone, appointmentDate, appointmentTime, notes } = req.body;

    // Validate required fields
    if (!teamMemberId || !userName || !userEmail || !appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Find the team member to get their name
    const teamMember = await TeamMember.findById(teamMemberId);
    
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        error: 'Team member not found'
      });
    }

    // Create new appointment document
    const appointment = new Appointment({
      teamMemberId,
      teamMemberName: teamMember.name,
      userName,
      userEmail,
      userPhone: userPhone || '',
      appointmentDate: new Date(appointmentDate),
      appointmentTime,
      notes: notes || '',
      status: 'pending'
    });

    await appointment.save();

    res.json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create appointment',
      message: error.message
    });
  }
});

// Get all appointments for a team member
app.get('/api/appointments/team-member/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const appointments = await Appointment.find({ teamMemberId: id })
      .sort({ appointmentDate: 1 });

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
});

// Get upcoming appointments for a user by email
app.get('/api/appointments/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const now = new Date();
    
    // Find appointments for this user that are in the future
    const appointments = await Appointment.find({ 
      userEmail: email,
      appointmentDate: { $gte: now },
      status: { $in: ['pending', 'confirmed'] }
    })
    .sort({ appointmentDate: 1 });

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Error fetching user appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user appointments',
      message: error.message
    });
  }
});

// Cancel appointment
app.put('/api/appointments/:id/cancel', requireVerification, async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment'
    });
  }
});

// Reschedule appointment
app.put('/api/appointments/:id/reschedule', requireVerification, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({
        success: false,
        error: 'Date and time are required'
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { 
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule appointment'
    });
  }
});

// Get all appointments
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ appointmentDate: 1 });

    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments',
      message: error.message
    });
  }
});

// ========================================
// LOCATION DATA ENDPOINTS (Ontario Cities)
// ========================================

// Get all locations
app.get('/api/locations', async (req, res) => {
  try {
    console.log('📍 Fetching all locations from database...');
    
    const locations = await LocationData.find()
      .select('locationName region averageHomePrice')
      .sort({ locationName: 1 });

    console.log(`✅ Retrieved ${locations.length} locations from database`);

    res.json({
      success: true,
      locations: locations,
      count: locations.length
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch locations',
      message: error.message
    });
  }
});

// Get specific location by name
app.get('/api/locations/:locationName', async (req, res) => {
  try {
    const { locationName } = req.params;
    console.log(`📍 Fetching location details for: ${locationName}`);

    const location = await LocationData.findOne({ 
      locationName: { $regex: new RegExp(`^${locationName}$`, 'i') } 
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    console.log(`✅ Found location: ${location.locationName}`);

    res.json({
      success: true,
      location: location
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch location details',
      message: error.message
    });
  }
});

// Manual refresh of location data (respects 7-day cooldown unless forced)
app.post('/api/locations/refresh', async (req, res) => {
  try {
    const forceRefresh = req.body?.force === true || req.query?.force === 'true';
    
    console.log(`🔄 Location data refresh ${forceRefresh ? '(FORCED)' : '(checking if needed)'}...`);
    
    // Check when locations were last updated
    const sampleLocation = await LocationData.findOne({ region: 'GTA Toronto' })
      .sort({ 'dataSource.lastUpdated': -1 });
    
    if (!sampleLocation) {
      // No data exists, run full scrape
      console.log('📍 No location data found, starting initial collection...');
      const result = await scrapeAndSaveAllLocations();
      return res.json({
        success: true,
        message: 'Initial location data collection completed',
        result: result,
        isInitial: true
      });
    }

    const lastUpdate = new Date(sampleLocation.dataSource.lastUpdated);
    const daysSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);

    // Refresh if forced OR data is older than 7 days
    if (forceRefresh || daysSinceUpdate >= 7) {
      console.log(`📊 Refreshing location data (${Math.floor(daysSinceUpdate)} days old)...`);
      
      // Clear old GTA Toronto data before refresh
      const deleteResult = await LocationData.deleteMany({ region: 'GTA Toronto' });
      console.log(`🗑️  Cleared ${deleteResult.deletedCount} old location records`);
      
      // Run fresh data collection
      const result = await scrapeAndSaveAllLocations();
      
      return res.json({
        success: true,
        message: 'Location data refresh completed with Brave API',
        result: result,
        cleared: deleteResult.deletedCount,
        daysSinceLastUpdate: Math.floor(daysSinceUpdate),
        forced: forceRefresh
      });
    } else {
      // Data is fresh, skip refresh
      console.log(`✅ Location data is up to date (${Math.floor(daysSinceUpdate)} days old)`);
      return res.json({
        success: true,
        message: 'Location data is already up to date',
        skipped: true,
        daysSinceLastUpdate: Math.floor(daysSinceUpdate),
        nextRefreshIn: Math.ceil(7 - daysSinceUpdate),
        hint: 'Add ?force=true to force refresh'
      });
    }
  } catch (error) {
    console.error('Error refreshing location data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh location data',
      message: error.message
    });
  }
});

// Get all approved feedback
app.get('/api/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find({ approved: true })
      .sort({ date: -1 })
      .limit(50);

    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback',
      message: error.message
    });
  }
});

// Get feedback by username
app.get('/api/feedback/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const feedback = await Feedback.find({ username, approved: true })
      .sort({ date: -1 });

    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('Error fetching user feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user feedback',
      message: error.message
    });
  }
});

// User registration/login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, email, loginEmail } = req.body;
    
    // For login: loginEmail and password required
    // For signup: username, password, and email required
    const isSignup = email && username ? true : false;
    const isLogin = loginEmail ? true : false;
    
    if (isLogin) {
      // LOGIN FLOW - use email to find user
      if (!loginEmail || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }
      
      const normalizedLoginEmail = loginEmail.toLowerCase().trim();
      const user = await User.findOne({ email: normalizedLoginEmail });
      
      if (!user) {
        return res.status(401).json({ success: false, error: 'No account found with this email. Please sign up.' });
      }
      
      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(423).json({ 
          success: false, 
          error: `Account is locked due to multiple failed login attempts. Please try again in ${minutesLeft} minutes.` 
        });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
          await user.save();
          return res.status(423).json({ 
            success: false, 
            error: 'Too many failed login attempts. Account locked for 30 minutes.' 
          });
        }
        await user.save();
        return res.status(401).json({ 
          success: false, 
          error: `Invalid password. ${5 - user.loginAttempts} attempts remaining.` 
        });
      }
      
      // Successful login - reset attempts
      user.loginAttempts = 0;
      user.lockUntil = null;
      user.lastLoginIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      await user.save();
      
      const token = jwt.sign(
        { username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({ 
        success: true, 
        user: { username: user.username, email: user.email }, 
        token,
        isNewUser: false,
        isVerified: user.isVerified,
        requiresVerification: !user.isVerified
      });
    }
    
    // SIGNUP FLOW - original logic
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }
    
    // Normalize username and email to lowercase
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    
    let user = await User.findOne({ username: normalizedUsername });
    
    if (!user) {
      // New signup - create user with hashed password
      if (!normalizedEmail) {
        return res.status(400).json({ success: false, error: 'Email is required for new accounts.' });
      }
      
      // Check if email already exists
      const existingEmail = await User.findOne({ email: normalizedEmail });
      if (existingEmail) {
        return res.status(400).json({ 
          success: false, 
          error: 'This email is already registered. Please login or use a different email.' 
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Please enter a valid email address.' 
        });
      }
      
      // Get IP address for tracking
      const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      
      // Hash password before saving
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ 
        username: normalizedUsername, 
        password: hashedPassword, 
        email: normalizedEmail,
        accountCreatedIP: ipAddress,
        lastLoginIP: ipAddress,
        isVerified: false // Start as unverified
      });
      await user.save();
      
      // Create a new per-user data collection (UserData)
      const userData = new UserData({ username, data: {} });
      await userData.save();
      
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save verification token (hashed) and expiration (10 minutes)
      user.verificationToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
      user.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      // Send verification email using Sendgrid
      if (process.env.SENDGRID_API_KEY) {
        try {
          await sgMail.send({
            to: normalizedEmail,
            from: FROM_EMAIL,
            subject: 'Verify Your Email - Mortgage Calculator',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Email Verification</h2>
                <p>Hello ${normalizedUsername},</p>
                <p>Thank you for signing up! Please use the following verification code to verify your email address:</p>
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
                  <h1 style="color: #1f2937; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't create an account with us, please ignore this email.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px;">Mortgage Calculator Team</p>
              </div>
            `
          });
          console.log(`✅ Verification email sent to ${normalizedEmail}`);
        } catch (emailError) {
          console.error('❌ Email sending error:', emailError.response?.body || emailError);
        }
      } else {
        console.warn('⚠️ Email not sent - Sendgrid not configured');
      }
      
      // Generate JWT token (user can login but features are locked until verified)
      const token = jwt.sign(
        { username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        success: true, 
        user: { username: user.username, email: user.email }, 
        token,
        isNewUser: true,
        requiresVerification: true,
        message: 'Account created! Please check your email for verification code.'
      });
    } else {
      // Username already exists during signup
      return res.status(400).json({ 
        success: false, 
        error: 'This username is already taken. Please choose a different username.' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Send verification email endpoint
app.post('/api/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ success: true, message: 'Email already verified' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save verification token (hashed) and expiration (10 minutes)
    user.verificationToken = crypto.createHash('sha256').update(verificationCode).digest('hex');
    user.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send email using Sendgrid
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject: 'Verify Your Email - Mortgage Calculator',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Email Verification</h2>
          <p>Hello ${user.username},</p>
          <p>Please use the following verification code to verify your email address:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1f2937; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">Mortgage Calculator Team</p>
        </div>
      `
    });

    console.log(`✅ Verification email resent to ${email}`);

    res.json({ 
      success: true, 
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to send verification email' });
  }
});

// Verify email endpoint
app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and code are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isVerified) {
      return res.json({ success: true, message: 'Email already verified' });
    }

    // Check if token expired
    if (!user.verificationTokenExpires || user.verificationTokenExpires < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Verification code expired. Please request a new code.' 
      });
    }

    // Hash the provided code and compare
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    
    if (hashedCode !== user.verificationToken) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now use all features.' 
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify email' });
  }
});

// Get user data from per-user collection (protected with JWT)
app.get('/api/userdata/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Verify user can only access their own data
    if (req.user.username !== username) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const userData = await UserData.findOne({ username });
    if (!userData) {
      return res.status(404).json({ success: false, error: 'User data not found' });
    }
    res.json({ success: true, data: userData.data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Save/update user data in per-user collection (protected with JWT and verification)
app.post('/api/userdata/:username', authenticateToken, requireVerification, async (req, res) => {
  try {
    const { username } = req.params;
    const { data } = req.body;
    
    // Verify user can only update their own data
    if (req.user.username !== username) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    let userData = await UserData.findOne({ username });
    if (!userData) {
      userData = new UserData({ username, data });
    } else {
      userData.data = data;
      userData.updatedAt = new Date();
    }
    await userData.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ============================================
// NEWS AND EVENTS ENDPOINTS
// ============================================

// News and Events API - Returns trusted mortgage news sources
app.get('/api/news-events', async (req, res) => {
  try {
    const newsAndEvents = [
      {
        id: 1,
        title: "Bank of Canada Interest Rate Decisions",
        description: "Official announcements and analysis of Bank of Canada's monetary policy decisions affecting mortgage rates.",
        url: "https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/",
        source: "Bank of Canada",
        category: "Official"
      },
      {
        id: 2,
        title: "Canadian Mortgage Trends - Industry News",
        description: "Latest mortgage industry news, rate changes, and expert analysis from Canada's leading mortgage publication.",
        url: "https://www.canadianmortgagetrends.com/",
        source: "Canadian Mortgage Trends",
        category: "Industry News"
      },
      {
        id: 3,
        title: "MoneySense - Mortgage & Real Estate",
        description: "Expert advice on mortgages, home buying tips, and real estate market insights for Canadian homeowners.",
        url: "https://www.moneysense.ca/spend/real-estate/",
        source: "MoneySense",
        category: "Financial Advice"
      },
      {
        id: 4,
        title: "RateHub Blog - Mortgage News",
        description: "Daily mortgage rate updates, market analysis, and home buying guides from Canada's rate comparison experts.",
        url: "https://www.ratehub.ca/blog/category/mortgages/",
        source: "RateHub",
        category: "Rate Updates"
      },
      {
        id: 5,
        title: "CMHC Housing Market Reports",
        description: "Official housing market outlook, research reports, and mortgage insurance insights from CMHC.",
        url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research",
        source: "CMHC",
        category: "Official"
      },
      {
        id: 6,
        title: "Financial Post - Real Estate",
        description: "Breaking news on Canadian real estate markets, mortgage trends, and economic factors affecting housing.",
        url: "https://financialpost.com/real-estate",
        source: "Financial Post",
        category: "News"
      },
      {
        id: 7,
        title: "Globe and Mail - Real Estate",
        description: "In-depth coverage of Canadian housing market, mortgage policies, and property investment insights.",
        url: "https://www.theglobeandmail.com/real-estate/",
        source: "Globe and Mail",
        category: "News"
      },
      {
        id: 8,
        title: "Mortgage Professionals Canada - News",
        description: "Industry updates, regulatory changes, and professional insights from Canada's mortgage broker association.",
        url: "https://mortgageproscan.ca/news",
        source: "Mortgage Professionals Canada",
        category: "Industry News"
      },
      {
        id: 9,
        title: "Bloomberg Canada - Housing",
        description: "Global perspective on Canadian housing market with economic analysis and mortgage rate forecasts.",
        url: "https://www.bloomberg.com/canada",
        source: "Bloomberg",
        category: "Financial News"
      },
      {
        id: 10,
        title: "Better Dwelling - Canadian Housing News",
        description: "Independent analysis of Canadian real estate market trends, mortgage data, and housing affordability.",
        url: "https://betterdwelling.com/",
        source: "Better Dwelling",
        category: "Analysis"
      }
    ];

    res.json({
      success: true,
      news: newsAndEvents,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch news and events' });
  }
});

// World Chat - In-memory storage for last 20 messages
let chatMessages = [];
const MAX_MESSAGES = 20;

// Socket.io connection for World Chat
io.on('connection', (socket) => {
  console.log('User connected to World Chat:', socket.id);
  
  // Send existing messages to newly connected user
  socket.emit('previous_messages', chatMessages);
  
  // Handle new message
  socket.on('send_message', (data) => {
    const { username, message, timestamp } = data;
    
    const chatMessage = {
      id: Date.now() + Math.random(), // Simple unique ID
      username,
      message,
      timestamp: timestamp || new Date().toISOString()
    };
    
    // Add new message and keep only last 20
    chatMessages.push(chatMessage);
    if (chatMessages.length > MAX_MESSAGES) {
      chatMessages = chatMessages.slice(-MAX_MESSAGES);
    }
    
    // Broadcast to all connected clients
    io.emit('receive_message', chatMessage);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected from World Chat:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
  console.log(`🌐 World Chat WebSocket is active`);
  console.log(`\n📊 Economic Data Endpoints (MongoDB + Web Scraping):`);
  console.log(`- GET  http://localhost:${PORT}/api/economic-data (All data)`);
  console.log(`- GET  http://localhost:${PORT}/api/economic-data/inflation`);
  console.log(`- GET  http://localhost:${PORT}/api/economic-data/central-bank-rate`);
  console.log(`- GET  http://localhost:${PORT}/api/economic-data/gdp-growth`);
  console.log(`- GET  http://localhost:${PORT}/api/economic-data/bond-yield`);
  console.log(`- POST http://localhost:${PORT}/api/economic-data/refresh (Manual refresh)`);
  console.log(`\n📰 News & Events Endpoint:`);
  console.log(`- GET  http://localhost:${PORT}/api/news-events (Get mortgage news links)`);
  console.log(`\n📍 Location Data Endpoints (GTA Toronto Areas):`);
  console.log(`- GET  http://localhost:${PORT}/api/locations (Get all locations)`);
  console.log(`- GET  http://localhost:${PORT}/api/locations/:locationName (Get specific location)`);
  console.log(`- POST http://localhost:${PORT}/api/locations/refresh (Manual refresh)`);
  console.log(`\n💬 Feedback Endpoints:`);
  console.log(`- POST http://localhost:${PORT}/api/feedback (Submit feedback)`);
  console.log(`- GET  http://localhost:${PORT}/api/feedback (Get all feedback)`);
  console.log(`- GET  http://localhost:${PORT}/api/feedback/user/:username (Get user feedback)`);
  console.log(`\n⏰� Auto-refresh scheduled: Every Sunday at 9:00 AM`);
});
