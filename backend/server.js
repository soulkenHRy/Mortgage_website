require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Models
const EconomicData = require('./models/EconomicData');
const MortgageRate = require('./models/MortgageRate');
const TeamMember = require('./models/TeamMember');
const Appointment = require('./models/Appointment');
const LocationData = require('./models/LocationData');

// Services
const { scrapeAndSaveEconomicData } = require('./scrapers/economicDataScraper');
const { scrapeAndSaveMortgageRates } = require('./scrapers/mortgageRateScraper');
const { scrapeAndSaveAllLocations } = require('./scrapers/locationDataScraper');

// Middleware
const { generalLimiter, adminLimiter } = require('./middleware/rateLimiting');
const { authenticateToken, requireVerification } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');
const feedbackRoutes = require('./routes/feedback');
const chatRoutes = require('./routes/chat');

// Initialize
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Env validation
const requiredEnvVars = ['MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('❌ FATAL: Missing environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is required!');
  process.exit(1);
}

// CORS
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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

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

app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());
app.set('trust proxy', 1);
app.use(generalLimiter);

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortgage-calculator';

mongoose.connect(MONGODB_URI)
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  scrapeAndSaveEconomicData()
    .then(() => console.log('✅ Economic data ready'))
    .catch(err => console.error('❌ Scrape error:', err.message));

  scrapeAndSaveMortgageRates()
    .then(() => console.log('✅ Mortgage rates ready'))
    .catch(err => console.error('❌ Rates error:', err.message));

  try {
    const locationCount = await LocationData.countDocuments();
    if (locationCount === 0) {
      console.log('🏘️  Initializing locations...');
      scrapeAndSaveAllLocations()
        .then(() => console.log('✅ Locations ready'))
        .catch(err => console.error('❌ Location error:', err.message));
    } else {
      console.log(`✅ ${locationCount} locations exist`);
    }
  } catch (err) {
    console.error('❌ Location check error:', err.message);
  }
})
.catch(err => console.error('❌ MongoDB error:', err));

// Cron
cron.schedule('0 9 * * 0', () => {
  console.log('⏰ Weekly refresh (Sunday 9AM)');
  scrapeAndSaveEconomicData();
  scrapeAndSaveMortgageRates();
  scrapeAndSaveAllLocations();
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API running' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/chat', chatRoutes);

// ==========================================
// MORTGAGE CALCULATOR
// ==========================================
app.post('/api/calculate-mortgage', (req, res) => {
  try {
    const { propertyPrice, downPayment, loanAmount, interestRate, loanTerm, propertyTax, insurance, hoaFees } = req.body;

    if (!interestRate || !loanTerm) {
      return res.status(400).json({ error: 'Interest rate and loan term are required' });
    }

    let principal = parseFloat(loanAmount) || 0;
    if (!principal && propertyPrice && downPayment) {
      principal = parseFloat(propertyPrice) - parseFloat(downPayment);
    }

    const rate = parseFloat(interestRate) / 100 / 12;
    const numberOfPayments = parseFloat(loanTerm) * 12;
    const tax = parseFloat(propertyTax) || 0;
    const insuranceCost = parseFloat(insurance) || 0;
    const hoa = parseFloat(hoaFees) || 0;

    if (principal <= 0 || rate <= 0 || numberOfPayments <= 0) {
      return res.status(400).json({ error: 'Please enter valid values for loan amount, interest rate, and loan term' });
    }

    const monthlyPayment = (principal * rate * Math.pow(1 + rate, numberOfPayments)) / (Math.pow(1 + rate, numberOfPayments) - 1);
    const totalPaid = monthlyPayment * numberOfPayments;
    const totalInterest = totalPaid - principal;
    const firstMonthInterest = principal * rate;
    const firstMonthPrincipal = monthlyPayment - firstMonthInterest;
    const totalMonthlyPayment = monthlyPayment + tax + insuranceCost + hoa;
    const downPaymentPercent = propertyPrice && downPayment ? (parseFloat(downPayment) / parseFloat(propertyPrice) * 100).toFixed(2) : null;

    const amortizationSchedule = [];
    let remainingBalance = principal;
    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = remainingBalance * rate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance -= principalPayment;
      if (remainingBalance < 0) remainingBalance = 0;
      amortizationSchedule.push({
        paymentNumber: i,
        payment: monthlyPayment.toFixed(2),
        principal: principalPayment.toFixed(2),
        interest: interestPayment.toFixed(2),
        remainingBalance: remainingBalance.toFixed(2)
      });
    }

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
    res.status(500).json({ error: 'An error occurred during calculation', message: error.message });
  }
});

// ==========================================
// ECONOMIC DATA ENDPOINTS
// ==========================================
app.get('/api/economic-data', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }).sort({ lastUpdated: -1 });
    if (!data) {
      return res.status(404).json({ error: 'No economic data found. Please try again in a few seconds' });
    }
    res.json({ success: true, data, lastUpdated: data.lastUpdated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch economic data', message: error.message });
  }
});

app.get('/api/economic-data/inflation', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { inflation: 1, lastUpdated: 1 });
    if (!data?.inflation) return res.status(404).json({ error: 'Inflation data not found' });
    res.json({ success: true, inflation: data.inflation, lastUpdated: data.lastUpdated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/economic-data/central-bank-rate', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { centralBankRate: 1, lastUpdated: 1 });
    if (!data?.centralBankRate) return res.status(404).json({ error: 'Central bank rate data not found' });
    res.json({ success: true, centralBankRate: data.centralBankRate, lastUpdated: data.lastUpdated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/economic-data/gdp-growth', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { gdpGrowth: 1, lastUpdated: 1 });
    if (!data?.gdpGrowth) return res.status(404).json({ error: 'GDP growth data not found' });
    res.json({ success: true, gdpGrowth: data.gdpGrowth, lastUpdated: data.lastUpdated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/economic-data/bond-yield', async (req, res) => {
  try {
    const data = await EconomicData.findOne({ country: 'Canada' }, { bondYield: 1, lastUpdated: 1 });
    if (!data?.bondYield) return res.status(404).json({ error: 'Bond yield data not found' });
    res.json({ success: true, bondYield: data.bondYield, lastUpdated: data.lastUpdated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/economic-data/refresh', adminLimiter, authenticateToken, async (req, res) => {
  try {
    const result = await scrapeAndSaveEconomicData();
    res.json({ success: true, message: 'Economic data refreshed', data: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh economic data', message: error.message });
  }
});

// ==========================================
// CANADA EXTERNAL API ENDPOINTS
// ==========================================
app.get('/api/canada/inflation', async (req, res) => {
  try {
    const response = await axios.get('https://api.worldbank.org/v2/country/CAN/indicator/FP.CPI.TOTL.ZG?format=json&date=2020:2025&per_page=10');
    if (response.data?.[1]) {
      const inflationData = response.data[1].map(item => ({ year: item.date, rate: item.value ? parseFloat(item.value).toFixed(2) : 'N/A', country: item.country.value }));
      res.json({ success: true, data: { indicator: 'Inflation Rate (CPI)', source: 'World Bank', country: 'Canada', values: inflationData, latestYear: inflationData[0]?.year, latestRate: inflationData[0]?.rate, unit: '%' } });
    } else {
      res.status(404).json({ error: 'No inflation data available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inflation data', message: error.message });
  }
});

app.get('/api/canada/policy-rate', async (req, res) => {
  try {
    const response = await axios.get('https://www.bankofcanada.ca/valet/observations/V39079/json?recent=10');
    if (response.data?.observations) {
      const policyRates = response.data.observations.map(item => ({ date: item.d, rate: parseFloat(item.V39079).toFixed(2) }));
      res.json({ success: true, data: { indicator: 'Bank of Canada Policy Rate', source: 'Bank of Canada', country: 'Canada', values: policyRates, latestDate: policyRates[policyRates.length - 1]?.date, latestRate: policyRates[policyRates.length - 1]?.rate, unit: '%' } });
    } else {
      res.status(404).json({ error: 'No policy rate data available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch policy rate data', message: error.message });
  }
});

app.get('/api/canada/gdp-growth', async (req, res) => {
  try {
    const response = await axios.get('https://api.worldbank.org/v2/country/CAN/indicator/NY.GDP.MKTP.KD.ZG?format=json&date=2018:2025&per_page=10');
    if (response.data?.[1]) {
      const gdpData = response.data[1].map(item => ({ year: item.date, growthRate: item.value ? parseFloat(item.value).toFixed(2) : 'N/A', country: item.country.value }));
      res.json({ success: true, data: { indicator: 'GDP Growth Rate', source: 'World Bank', country: 'Canada', values: gdpData, latestYear: gdpData[0]?.year, latestGrowthRate: gdpData[0]?.growthRate, unit: '%' } });
    } else {
      res.status(404).json({ error: 'No GDP data available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch GDP growth data', message: error.message });
  }
});

app.get('/api/canada/bond-yield', async (req, res) => {
  try {
    const response = await axios.get('https://www.bankofcanada.ca/valet/observations/V122544/json?recent=10');
    if (response.data?.observations) {
      const bondYields = response.data.observations.map(item => ({ date: item.d, yield: item.V122544 ? parseFloat(item.V122544).toFixed(2) : 'N/A' }));
      res.json({ success: true, data: { indicator: 'Government of Canada 10-Year Bond Yield', source: 'Bank of Canada', country: 'Canada', values: bondYields, latestDate: bondYields[bondYields.length - 1]?.date, latestYield: bondYields[bondYields.length - 1]?.yield, unit: '%' } });
    } else {
      res.status(404).json({ error: 'No bond yield data available' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bond yield data', message: error.message });
  }
});

app.get('/api/canada/economic-overview', async (req, res) => {
  try {
    const [inflationRes, policyRateRes, gdpRes, bondYieldRes] = await Promise.allSettled([
      axios.get('https://api.worldbank.org/v2/country/CAN/indicator/FP.CPI.TOTL.ZG?format=json&date=2023:2025&per_page=3'),
      axios.get('https://www.bankofcanada.ca/valet/observations/V39079/json?recent=1'),
      axios.get('https://api.worldbank.org/v2/country/CAN/indicator/NY.GDP.MKTP.KD.ZG?format=json&date=2022:2025&per_page=3'),
      axios.get('https://www.bankofcanada.ca/valet/observations/V122544/json?recent=1')
    ]);

    const overview = { success: true, country: 'Canada', lastUpdated: new Date().toISOString(), indicators: {} };

    if (inflationRes.status === 'fulfilled' && inflationRes.value.data[1]) {
      const latest = inflationRes.value.data[1][0];
      overview.indicators.inflation = { name: 'Inflation Rate', value: latest.value ? parseFloat(latest.value).toFixed(2) : 'N/A', year: latest.date, unit: '%', source: 'World Bank' };
    }
    if (policyRateRes.status === 'fulfilled' && policyRateRes.value.data.observations) {
      const latest = policyRateRes.value.data.observations[0];
      overview.indicators.policyRate = { name: 'Bank of Canada Policy Rate', value: latest.V39079 ? parseFloat(latest.V39079).toFixed(2) : 'N/A', date: latest.d, unit: '%', source: 'Bank of Canada' };
    }
    if (gdpRes.status === 'fulfilled' && gdpRes.value.data[1]) {
      const latest = gdpRes.value.data[1][0];
      overview.indicators.gdpGrowth = { name: 'GDP Growth Rate', value: latest.value ? parseFloat(latest.value).toFixed(2) : 'N/A', year: latest.date, unit: '%', source: 'World Bank' };
    }
    if (bondYieldRes.status === 'fulfilled' && bondYieldRes.value.data.observations) {
      const latest = bondYieldRes.value.data.observations[0];
      overview.indicators.bondYield = { name: '10-Year Government Bond Yield', value: latest.V122544 ? parseFloat(latest.V122544).toFixed(2) : 'N/A', date: latest.d, unit: '%', source: 'Bank of Canada' };
    }

    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch economic overview', message: error.message });
  }
});

// ==========================================
// MORTGAGE RATES
// ==========================================
app.get('/api/mortgage-rates', async (req, res) => {
  try {
    const rates = await MortgageRate.findOne({ country: 'Canada' });
    if (!rates) {
      return res.status(404).json({ success: false, error: 'Mortgage rates not found' });
    }
    res.json({
      success: true,
      rates: {
        bankRate: rates.bankRate, fixedRates: rates.fixedRates, paymentsPerHundredK: rates.paymentsPerHundredK,
        currentVariableRate: rates.currentVariableRate, currentPrimeRate: rates.currentPrimeRate,
        insuredRates: rates.insuredRates, uninsuredRates: rates.uninsuredRates, scrapedSuccessfully: rates.scrapedSuccessfully || false
      },
      lastUpdated: rates.lastUpdated, source: rates.source
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch mortgage rates', message: error.message });
  }
});

app.post('/api/mortgage-rates/refresh', adminLimiter, authenticateToken, async (req, res) => {
  try {
    const result = await scrapeAndSaveMortgageRates();
    res.json({ success: true, message: 'Mortgage rates refreshed', data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to refresh mortgage rates', message: error.message });
  }
});

// ==========================================
// TEAM MEMBERS
// ==========================================
app.get('/api/team-members', async (req, res) => {
  try {
    const teamMembers = await TeamMember.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: teamMembers, count: teamMembers.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch team members', message: error.message });
  }
});

// ==========================================
// APPOINTMENTS
// ==========================================
app.post('/api/appointments', requireVerification, async (req, res) => {
  try {
    const { teamMemberId, userName, userEmail, userPhone, appointmentDate, appointmentTime, notes } = req.body;
    if (!teamMemberId || !userName || !userEmail || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const teamMember = await TeamMember.findById(teamMemberId);
    if (!teamMember) return res.status(404).json({ success: false, error: 'Team member not found' });

    const appointment = new Appointment({
      teamMemberId, teamMemberName: teamMember.name, userName, userEmail,
      userPhone: userPhone || '', appointmentDate: new Date(appointmentDate),
      appointmentTime, notes: notes || '', status: 'pending'
    });
    await appointment.save();
    res.json({ success: true, message: 'Appointment scheduled', data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create appointment', message: error.message });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ appointmentDate: 1 });
    res.json({ success: true, data: appointments, count: appointments.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch appointments', message: error.message });
  }
});

app.get('/api/appointments/team-member/:id', async (req, res) => {
  try {
    const appointments = await Appointment.find({ teamMemberId: req.params.id }).sort({ appointmentDate: 1 });
    res.json({ success: true, data: appointments, count: appointments.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch appointments', message: error.message });
  }
});

app.get('/api/appointments/user/:email', async (req, res) => {
  try {
    const appointments = await Appointment.find({ 
      userEmail: req.params.email, appointmentDate: { $gte: new Date() }, status: { $in: ['pending', 'confirmed'] }
    }).sort({ appointmentDate: 1 });
    res.json({ success: true, data: appointments, count: appointments.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user appointments', message: error.message });
  }
});

app.put('/api/appointments/:id/cancel', requireVerification, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled', updatedAt: new Date() }, { new: true });
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    res.json({ success: true, message: 'Appointment cancelled', appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
  }
});

app.put('/api/appointments/:id/reschedule', requireVerification, async (req, res) => {
  try {
    const { appointmentDate, appointmentTime } = req.body;
    if (!appointmentDate || !appointmentTime) return res.status(400).json({ success: false, error: 'Date and time required' });
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { appointmentDate: new Date(appointmentDate), appointmentTime, updatedAt: new Date() }, { new: true });
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found' });
    res.json({ success: true, message: 'Appointment rescheduled', appointment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reschedule appointment' });
  }
});

// ==========================================
// NEWS & EVENTS
// ==========================================
app.get('/api/news-events', async (req, res) => {
  try {
    const newsAndEvents = [
      { id: 1, title: "Bank of Canada Interest Rate Decisions", description: "Official announcements and analysis of Bank of Canada's monetary policy decisions.", url: "https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/", source: "Bank of Canada", category: "Official" },
      { id: 2, title: "Canadian Mortgage Trends - Industry News", description: "Latest mortgage industry news and expert analysis.", url: "https://www.canadianmortgagetrends.com/", source: "Canadian Mortgage Trends", category: "Industry News" },
      { id: 3, title: "MoneySense - Mortgage & Real Estate", description: "Expert advice on mortgages and home buying.", url: "https://www.moneysense.ca/spend/real-estate/", source: "MoneySense", category: "Financial Advice" },
      { id: 4, title: "RateHub Blog - Mortgage News", description: "Daily mortgage rate updates and market analysis.", url: "https://www.ratehub.ca/blog/category/mortgages/", source: "RateHub", category: "Rate Updates" },
      { id: 5, title: "CMHC Housing Market Reports", description: "Official housing market outlook and research reports.", url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research", source: "CMHC", category: "Official" },
      { id: 6, title: "Financial Post - Real Estate", description: "Breaking news on Canadian real estate markets.", url: "https://financialpost.com/real-estate", source: "Financial Post", category: "News" },
      { id: 7, title: "Globe and Mail - Real Estate", description: "In-depth coverage of Canadian housing market.", url: "https://www.theglobeandmail.com/real-estate/", source: "Globe and Mail", category: "News" },
      { id: 8, title: "Mortgage Professionals Canada - News", description: "Industry updates and regulatory changes.", url: "https://mortgageproscan.ca/news", source: "Mortgage Professionals Canada", category: "Industry News" }
    ];
    res.json({ success: true, news: newsAndEvents, lastUpdated: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch news and events' });
  }
});

// ==========================================
// WORLD CHAT (Socket.IO)
// ==========================================
let chatMessages = [];
const MAX_MESSAGES = 20;

io.on('connection', (socket) => {
  console.log('User connected to World Chat:', socket.id);
  socket.emit('previous_messages', chatMessages);

  socket.on('send_message', (data) => {
    const sanitizedUsername = String(data.username || 'Anonymous').replace(/[<>"'&]/g, '').substring(0, 50);
    const sanitizedMessage = String(data.message || '').replace(/[<>"'&]/g, '').substring(0, 500);
    if (!sanitizedMessage.trim()) return;

    const chatMessage = {
      id: Date.now() + Math.random(),
      username: sanitizedUsername,
      message: sanitizedMessage,
      timestamp: data.timestamp || new Date().toISOString()
    };

    chatMessages.push(chatMessage);
    if (chatMessages.length > MAX_MESSAGES) chatMessages = chatMessages.slice(-MAX_MESSAGES);
    io.emit('receive_message', chatMessage);
  });

  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

// ==========================================
// START SERVER
// ==========================================
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 World Chat WebSocket active`);
  console.log(`📊 API Endpoints ready`);
});
