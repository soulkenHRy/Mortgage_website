import { useState, useEffect } from 'react'
import './App.css'
import { LineChart, Line, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import MortgageRatesTable from './MortgageRatesTable'
import Locations from './components/Locations'
import WorldChat from './components/WorldChat'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const preloadAssets = () => {
  const imageSources = [
    '/Toronto.jpg',
    '/WebsiteLOGO.png',
    '/My_team.jpg',
    '/my_pic.jpg',
    '/Greater_Toronto_Area_map.png',
    '/aman_pic.jpeg',
    '/lenders/Royal-Bank-of-Canada-Logo.png',
    '/lenders/BMO-logo.webp',
    '/lenders/1762724100628.png',
    '/lenders/1762724210186.png',
    '/lenders/lender.png'
  ];
  
  imageSources.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  const videoSources = [
    '/hero_video/calculator.mp4',
    '/hero_video/brokers_and_agents.mp4',
    '/hero_video/rates.mp4',
    '/hero_video/news_and_events.mp4'
  ];

  videoSources.forEach(src => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.src = src;
    video.load();
  });
};

preloadAssets();

function MortgageQualifier({ economicData }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyState: '',
    annualIncome: '',
    employmentStatus: 'employed',
    otherIncome: '',
    monthlyDebts: '',
    creditRange: 'good',
    homePurchasePrice: '',
    downPayment: '',
    loanType: 'conventional',
    loanTerm: '30',
    firstTimeBuyer: false,
    purchaseTimeline: '3-6'
  })
  
  const [results, setResults] = useState(null)
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }
  
  const calculateQualification = () => {
    const income = parseFloat(formData.annualIncome) || 0
    const otherIncome = parseFloat(formData.otherIncome) || 0
    const totalIncome = income + otherIncome
    const monthlyIncome = totalIncome / 12
    const monthlyDebts = parseFloat(formData.monthlyDebts) || 0
    const downPayment = parseFloat(formData.downPayment) || 0
    const purchasePrice = parseFloat(formData.homePurchasePrice) || 0
    
    // Interest rate based on credit
    const interestRates = {
      excellent: 6.5,
      good: 7.0,
      fair: 7.5,
      poor: 8.5
    }
    const rate = interestRates[formData.creditRange] || 7.0
    const monthlyRate = rate / 100 / 12
    const numPayments = parseInt(formData.loanTerm) * 12
    
    // Calculate DTI (should be below 43%)
    const maxMonthlyPayment = (monthlyIncome * 0.43) - monthlyDebts
    
    // Calculate max loan based on payment
    const maxLoan = maxMonthlyPayment * ((Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments)))
    
    // Calculate max home price (loan + down payment)
    const maxHomePrice = maxLoan + downPayment
    
    // Calculate actual loan if purchase price specified
    const loanAmount = purchasePrice > 0 ? purchasePrice - downPayment : maxLoan
    
    // Calculate monthly payment
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
    
    // Calculate DTI ratio
    const dti = ((monthlyPayment + monthlyDebts) / monthlyIncome * 100).toFixed(1)
    
    // Determine eligibility
    const eligible = dti <= 43 && downPayment >= (purchasePrice * 0.03)
    
    // Down payment percentage
    const downPaymentPercent = purchasePrice > 0 ? (downPayment / purchasePrice * 100).toFixed(1) : 0
    
    setResults({
      maxLoan: maxLoan.toFixed(0),
      maxHomePrice: maxHomePrice.toFixed(0),
      eligible: eligible,
      monthlyPayment: monthlyPayment.toFixed(2),
      dti: dti,
      downPaymentPercent: downPaymentPercent,
      interestRate: rate,
      recommendation: eligible ? 'You appear to be pre-qualified! Proceed to formal pre-approval.' : 'Consider reducing debt or increasing down payment before applying.'
    })
  }
  
  return (
    <>
      {/* Economic Indicators Box */}
      {economicData && (
        <div className="economic-indicators-box">
          <h3 className="economic-box-title">Canadian Economic Indicators</h3>
          <div className="economic-grid">
            <div className="economic-card">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                <polyline points="17 6 23 6 23 12"/>
              </svg>
              <div className="economic-info">
                <span className="economic-label">Inflation Rate</span>
                <span className="economic-value">{economicData.inflation?.rate}%</span>
              </div>
            </div>

            <div className="economic-card">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <div className="economic-info">
                <span className="economic-label">Bank of Canada Rate</span>
                <span className="economic-value">{economicData.centralBankRate?.rate}%</span>
              </div>
            </div>

            <div className="economic-card">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <div className="economic-info">
                <span className="economic-label">GDP Growth (compared to previous quarter)</span>
                <span className="economic-value">
                  {economicData.gdpGrowth?.rate !== undefined && economicData.gdpGrowth?.rate !== null ? Number(economicData.gdpGrowth.rate).toFixed(5) : 'N/A'}%
                </span>
              </div>
            </div>

            <div className="economic-card">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div className="economic-info">
                <span className="economic-label">10-Year Bond Yield</span>
                <span className="economic-value">{economicData.bondYield?.tenYear}%</span>
              </div>
            </div>
          </div>
          <div className="economic-update">
            Updated: {new Date(economicData.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="qualifier-box">
        <h2 className="qualifier-title">Mortgage Pre-Qualification</h2>
        <p className="qualifier-subtitle">Get pre-qualified in minutes</p>
        
        <form className="qualifier-form" onSubmit={(e) => { e.preventDefault(); calculateQualification(); }}>
        {/* Personal Information */}
        <div className="qualifier-section">
          <h3>Personal Information</h3>
          <div className="qualifier-row">
            <input type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required />
            <input type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required />
          </div>
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} required />
          <input type="tel" name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleInputChange} required />
          <input type="text" name="propertyState" placeholder="Property State/Location" value={formData.propertyState} onChange={handleInputChange} required />
        </div>
        
        {/* Financial Information */}
        <div className="qualifier-section">
          <h3>Financial Information</h3>
          <input type="number" name="annualIncome" placeholder="Gross Annual Income ($)" value={formData.annualIncome} onChange={handleInputChange} required />
          <select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange}>
            <option value="employed">Employed</option>
            <option value="self-employed">Self-Employed</option>
            <option value="retired">Retired</option>
          </select>
          <input type="number" name="otherIncome" placeholder="Other Income (Optional)" value={formData.otherIncome} onChange={handleInputChange} />
          <input type="number" name="monthlyDebts" placeholder="Total Monthly Debts ($)" value={formData.monthlyDebts} onChange={handleInputChange} required />
        </div>
        
        {/* Credit Profile */}
        <div className="qualifier-section">
          <h3>Credit Profile</h3>
          <select name="creditRange" value={formData.creditRange} onChange={handleInputChange}>
            <option value="excellent">Excellent (740+)</option>
            <option value="good">Good (670-739)</option>
            <option value="fair">Fair (580-669)</option>
            <option value="poor">Poor (&lt;580)</option>
          </select>
        </div>
        
        {/* Loan Details */}
        <div className="qualifier-section">
          <h3>Loan Details</h3>
          <input type="number" name="homePurchasePrice" placeholder="Estimated Home Purchase Price ($)" value={formData.homePurchasePrice} onChange={handleInputChange} required />
          <input type="number" name="downPayment" placeholder="Down Payment Amount ($)" value={formData.downPayment} onChange={handleInputChange} required />
          <select name="loanType" value={formData.loanType} onChange={handleInputChange}>
            <option value="conventional">Conventional</option>
            <option value="fha">FHA</option>
            <option value="va">VA</option>
            <option value="usda">USDA</option>
          </select>
          <select name="loanTerm" value={formData.loanTerm} onChange={handleInputChange}>
            <option value="15">15-Year</option>
            <option value="30">30-Year</option>
          </select>
        </div>
        
        {/* Borrower Profile */}
        <div className="qualifier-section">
          <h3>Borrower Profile</h3>
          <label className="qualifier-checkbox">
            <input type="checkbox" name="firstTimeBuyer" checked={formData.firstTimeBuyer} onChange={handleInputChange} />
            First-time homebuyer
          </label>
          <select name="purchaseTimeline" value={formData.purchaseTimeline} onChange={handleInputChange}>
            <option value="1-3">1-3 months</option>
            <option value="3-6">3-6 months</option>
            <option value="6-12">6-12 months</option>
            <option value="12+">12+ months</option>
          </select>
        </div>
        
        <button type="submit" className="qualifier-submit-btn">Get Pre-Qualified</button>
      </form>
      
      {/* Results */}
      {results && (
        <div className="qualifier-results">
          <h3 className={results.eligible ? 'eligible' : 'needs-review'}>
            {results.eligible ? '✓ Pre-Qualification Eligible' : '⚠ Needs Review'}
          </h3>
          
          <div className="result-grid">
            <div className="result-item">
              <span className="result-label">Maximum Loan Amount</span>
              <span className="result-value">${parseInt(results.maxLoan).toLocaleString()}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Maximum Home Price</span>
              <span className="result-value">${parseInt(results.maxHomePrice).toLocaleString()}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Est. Monthly Payment</span>
              <span className="result-value">${parseFloat(results.monthlyPayment).toLocaleString()}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Debt-to-Income Ratio</span>
              <span className="result-value">{results.dti}%</span>
            </div>
            <div className="result-item">
              <span className="result-label">Down Payment</span>
              <span className="result-value">{results.downPaymentPercent}%</span>
            </div>
            <div className="result-item">
              <span className="result-label">Est. Interest Rate</span>
              <span className="result-value">{results.interestRate}%</span>
            </div>
          </div>
          
          <div className="result-recommendation">
            <p><strong>Next Steps:</strong> {results.recommendation}</p>
          </div>
          
          <div className="result-disclaimer">
            <p><em>Disclaimer: This is an estimate only and not a formal approval. Actual qualification requires formal verification of income, credit, and assets.</em></p>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

function App() {
  const [propertyPrice, setPropertyPrice] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [downPaymentType, setDownPaymentType] = useState('amount') // 'amount' or 'percentage'
  const [loanAmount, setLoanAmount] = useState('')
  const [interestRate, setInterestRate] = useState('')
  const [loanTerm, setLoanTerm] = useState('30')
  const [propertyTax, setPropertyTax] = useState('')
  const [insurance, setInsurance] = useState('')
  const [hoaFees, setHoaFees] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scheduleView, setScheduleView] = useState('yearly') // 'monthly' or 'yearly'
  const [comparisonResults, setComparisonResults] = useState(null)
  const [showComparison, setShowComparison] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState([])
  const [scenarioName, setScenarioName] = useState('')
  const [autoCalculate, setAutoCalculate] = useState(false)
  const [currentView, setCurrentView] = useState(null) // 'calculator', 'loan-products', 'interest-rates', 'educational-content', 'testimonials', 'team', 'faq', or null
  const [economicData, setEconomicData] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [signupData, setSignupData] = useState({ email: '', username: '', password: '' })
  const [openFaqItems, setOpenFaqItems] = useState(new Set())
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [isVerified, setIsVerified] = useState(true) // Assume verified until told otherwise
  const [pendingUser, setPendingUser] = useState(null) // Store user info until email is verified
  const [feedbackData, setFeedbackData] = useState({ rating: 5, feedback: '' })
  const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || null)
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || null)
  const [allFeedback, setAllFeedback] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [selectedTeamMember, setSelectedTeamMember] = useState(null)
  const [appointmentData, setAppointmentData] = useState({
    userName: '',
    userEmail: '',
    userPhone: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: ''
  })
  const [userAppointments, setUserAppointments] = useState([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0)
  const [showFeedbackBody, setShowFeedbackBody] = useState(false)
  const [newsAndEvents, setNewsAndEvents] = useState([])

  // Image mapping for news items - moved outside render for performance
  const newsImageMap = {
    1: '/news_and_events/bank_of_canada_official_Interest_Rate.jpg',
    2: '/news_and_events/canada_mortgage_trends.jpg',
    3: '/news_and_events/money|_sense_mortgage_and_realestate.jpg',
    4: '/news_and_events/rate_hub_mortgage_news.jpg',
    5: '/news_and_events/housing_market_report.jpg',
    6: '/news_and_events/Real_estate_financialPOST.jpg',
    7: '/news_and_events/Globe_and_mail_real_estate.jpg',
    8: '/news_and_events/Industry_News_mortgage_professionals_canada.jpg',
    9: '/news_and_events/financial_advice_(money_sense).jpg',
    10: '/news_and_events/better_dwelling_analysis.jpg'
  }

  // Fetch news and events from backend
  const fetchNewsAndEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/news-events`);
      const data = await response.json();
      if (data.success) {
        setNewsAndEvents(data.news);
      }
    } catch (error) {
      console.error('Error fetching news and events:', error);
    }
  };

  // Handle nav click - toggle view on/off
  const handleNavClick = (view) => {
    if (currentView === view) {
      setCurrentView(null) // Deselect if clicking on active view
    } else {
      setCurrentView(view) // Select new view
    }
  }

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault()
    // login data to backend(username and password)
    fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loginEmail: loginData.email,
        password: loginData.password
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.user && data.user.username && data.token) {
          // Check if user needs verification BEFORE logging them in
          if (data.requiresVerification) {
            // Store pending user info - don't log them in yet
            setPendingUser({
              username: data.user.username,
              email: data.user.email,
              token: data.token
            })
            setIsVerified(false)
            setVerificationEmail(data.user.email)
            setShowLoginModal(false)
            setShowVerificationModal(true)
            alert('Please verify your email to access your account. Check your email for the verification code.')
          } else {
            // User is verified - log them in
            setCurrentUser(data.user.username)
            setAuthToken(data.token)
            localStorage.setItem('username', data.user.username)
            localStorage.setItem('authToken', data.token)
            if (data.user.email) {
              localStorage.setItem('userEmail', data.user.email)
              fetchUserAppointments(data.user.email)
            }
            setIsVerified(true)
            setShowLoginModal(false)
            alert('Login successful!')
          }
        } else {
          alert(data.error || 'Login failed. Please check your credentials.')
        }
        setLoginData({ email: '', password: '' })
      })
      .catch(() => {
        alert('Login error. Please try again later.')
      })
  }

  // Handle signup
  const handleSignup = (e) => {
    e.preventDefault()
    // Send signup data to backend (same endpoint for now)
    fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData)
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.user && data.user.username && data.token) {
          // For new users, store as pending - don't log them in until verified
          if (data.isNewUser || data.requiresVerification) {
            setPendingUser({
              username: data.user.username,
              email: data.user.email,
              token: data.token
            })
            setIsVerified(false)
            setVerificationEmail(data.user.email)
            setShowSignupModal(false)
            alert(data.message || 'Account created! Please check your email for verification code.')
            setShowVerificationModal(true)
          } else {
            // Already verified (shouldn't happen for new users, but just in case)
            setCurrentUser(data.user.username)
            setAuthToken(data.token)
            localStorage.setItem('username', data.user.username)
            localStorage.setItem('authToken', data.token)
            if (data.user.email) {
              localStorage.setItem('userEmail', data.user.email)
            }
            setIsVerified(true)
            setShowSignupModal(false)
            alert('Signup successful!')
          }
        } else {
          alert(data.error || 'Signup failed. Please try again.')
        }
        setSignupData({ email: '', username: '', password: '' })
      })
      .catch(() => {
        alert('Signup error. Please try again later.')
      })
  }

  // Handle email verification
  const handleVerifyEmail = async (e) => {
    e.preventDefault()
    
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code')
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail,
          code: verificationCode
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setIsVerified(true)
        setShowVerificationModal(false)
        setVerificationCode('')
        
        // Now complete the login with pending user info
        if (pendingUser) {
          setCurrentUser(pendingUser.username)
          setAuthToken(pendingUser.token)
          localStorage.setItem('username', pendingUser.username)
          localStorage.setItem('authToken', pendingUser.token)
          if (pendingUser.email) {
            localStorage.setItem('userEmail', pendingUser.email)
            fetchUserAppointments(pendingUser.email)
          }
          setPendingUser(null) // Clear pending user
        }
        
        alert(data.message || 'Email verified successfully! You are now logged in.')
      } else {
        alert(data.error || 'Verification failed. Please try again.')
      }
    } catch (error) {
      console.error('Verification error:', error)
      alert('Failed to verify email. Please try again.')
    }
  }

  // Resend verification code
  const handleResendVerification = async () => {
    try {
      const response = await fetch(`${API_URL}/api/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(data.message || 'Verification code sent! Check your email.')
      } else {
        alert(data.error || 'Failed to send verification code.')
      }
    } catch (error) {
      console.error('Resend error:', error)
      alert('Failed to resend verification code. Please try again.')
    }
  }

  // Handle feedback submission
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()

    if (!currentUser) {
      alert('Please login to submit feedback')
      setShowFeedbackModal(false)
      setShowLoginModal(true)
      return
    }

    if (!isVerified) {
      alert('Please verify your email before submitting feedback')
      setShowFeedbackModal(false)
      setShowVerificationModal(true)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          username: currentUser,
          rating: feedbackData.rating,
          feedback: feedbackData.feedback,
          date: new Date().toISOString()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Optimistic UI update - add feedback immediately to the list
        const newFeedback = {
          _id: data.feedback?._id || Date.now().toString(),
          username: currentUser,
          rating: feedbackData.rating,
          feedback: feedbackData.feedback,
          date: new Date().toISOString(),
          approved: false // Will show as pending until admin approves
        }

        setAllFeedback(prev => [newFeedback, ...prev])

        alert('Thank you for your feedback!')
        setShowFeedbackModal(false)
        setFeedbackData({ rating: 5, feedback: '' })

        // Backend is already synced, will reload from database on next page refresh
      } else {
        alert('Failed to submit feedback. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      alert('Error submitting feedback. Please try again.')
    }
  }

  // Fetch all feedback from database
  const fetchAllFeedback = async () => {
    try {
      const response = await fetch(`${API_URL}/api/feedback`)
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        setAllFeedback(data.data)
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    }
  }

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/team-members`)
      const data = await response.json()
      if (data.success && Array.isArray(data.data)) {
        setTeamMembers(data.data)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  // Fetch user's upcoming appointments
  const fetchUserAppointments = async (userEmail) => {
    if (!userEmail) {
      console.log('No userEmail provided to fetchUserAppointments')
      return
    }
    
    try {
      console.log('Fetching appointments for:', userEmail)
      const response = await fetch(`${API_URL}/api/appointments/user/${encodeURIComponent(userEmail)}`)
      const data = await response.json()
      console.log('Appointments response:', data)
      
      if (data.success && Array.isArray(data.data)) {
        setUserAppointments(data.data)
        console.log(`Loaded ${data.data.length} appointments`)
      } else {
        console.log('No appointments found or invalid response')
      }
    } catch (error) {
      console.error('Error fetching user appointments:', error)
    }
  }

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointmentId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const data = await response.json()

      if (data.success) {
        // Optimistic UI update - update appointment status immediately
        setUserAppointments(prev => 
          prev.map(apt => 
            apt._id === appointmentId 
              ? { ...apt, status: 'cancelled' }
              : apt
          )
        )
        
        alert('Appointment cancelled successfully')
      } else {
        alert(data.error || 'Failed to cancel appointment')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Error cancelling appointment. Please try again.')
    }
  }

  // Reschedule appointment
  const handleRescheduleAppointment = async (appointment) => {
    const newDate = prompt('Enter new date (YYYY-MM-DD):', appointment.appointmentDate.split('T')[0])
    if (!newDate) return

    const newTime = prompt('Enter new time (e.g., 10:00 AM):', appointment.appointmentTime)
    if (!newTime) return

    try {
      const response = await fetch(`${API_URL}/api/appointments/${appointment._id}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          appointmentDate: newDate,
          appointmentTime: newTime
        })
      })

      const data = await response.json()

      if (data.success) {
        // Optimistic UI update - update appointment immediately
        setUserAppointments(prev => 
          prev.map(apt => 
            apt._id === appointment._id 
              ? { ...apt, appointmentDate: newDate, appointmentTime: newTime }
              : apt
          )
        )
        
        alert('Appointment rescheduled successfully!')
      } else {
        alert(data.error || 'Failed to reschedule appointment')
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      alert('Error rescheduling appointment. Please try again.')
    }
  }

  // Open appointment modal
  const handleScheduleConsultation = (teamMember) => {
    // Check if user is logged in
    if (!currentUser) {
      alert('Please log in or sign up to schedule an appointment.')
      setShowLoginModal(true)
      return
    }

    // Check if user is verified
    if (!isVerified) {
      alert('Please verify your email before scheduling an appointment.')
      setShowVerificationModal(true)
      return
    }

    setSelectedTeamMember(teamMember)
    setAppointmentData({
      userName: currentUser || '',
      userEmail: localStorage.getItem('userEmail') || '',
      userPhone: '',
      appointmentDate: '',
      appointmentTime: '',
      notes: ''
    })
    setShowAppointmentModal(true)
  }

  // Handle appointment form submission
  const handleAppointmentSubmit = async (e) => {
    e.preventDefault()

    if (!appointmentData.appointmentDate || !appointmentData.appointmentTime) {
      alert('Please select a date and time for your appointment.')
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          teamMemberId: selectedTeamMember._id,
          userName: appointmentData.userName,
          userEmail: appointmentData.userEmail,
          userPhone: appointmentData.userPhone,
          appointmentDate: appointmentData.appointmentDate,
          appointmentTime: appointmentData.appointmentTime,
          notes: appointmentData.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        // Optimistic UI update - add appointment immediately to the list
        const newAppointment = {
          _id: data.appointment?._id || Date.now().toString(),
          teamMemberName: selectedTeamMember.name,
          appointmentDate: appointmentData.appointmentDate,
          appointmentTime: appointmentData.appointmentTime,
          status: 'pending',
          userPhone: appointmentData.userPhone,
          notes: appointmentData.notes
        }
        
        setUserAppointments(prev => [...prev, newAppointment])
        
        alert(`Consultation scheduled successfully with ${selectedTeamMember.name}!\n\nDate: ${appointmentData.appointmentDate}\nTime: ${appointmentData.appointmentTime}`)
        setShowAppointmentModal(false)
        setAppointmentData({
          userName: '',
          userEmail: '',
          userPhone: '',
          appointmentDate: '',
          appointmentTime: '',
          notes: ''
        })
        
        // Backend is already synced, will reload from database on next login/refresh
      } else {
        alert('Failed to schedule appointment. Please try again.')
      }
    } catch (error) {
      console.error('Error scheduling appointment:', error)
      alert('Error scheduling appointment. Please try again.')
    }
  }

  // Toggle FAQ item
  const toggleFaqItem = (index) => {
    const newOpenItems = new Set(openFaqItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenFaqItems(newOpenItems)
  }

  // Fetch economic data on component mount
  useEffect(() => {
    fetchEconomicData()
    fetchAllFeedback()
    fetchTeamMembers()
    fetchNewsAndEvents()
    // Refresh every 5 minutes
    const interval = setInterval(fetchEconomicData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Load user scenarios and appointments when user logs in
  useEffect(() => {
    if (currentUser) {
      loadUserScenarios()
      const userEmail = localStorage.getItem('userEmail')
      if (userEmail) {
        fetchUserAppointments(userEmail)
      }
    } else {
      setSavedScenarios([])
      setUserAppointments([])
    }
  }, [currentUser])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-profile-container')) {
        setShowUserDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserDropdown])

  const fetchEconomicData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/economic-data`)
      const data = await response.json()
      if (data.success) {
        setEconomicData(data.data)
      }
    } catch (error) {
      console.error('Error fetching economic data:', error)
    }
  }

  // Auto-calculate loan amount when property price or down payment changes
  useEffect(() => {
    if (propertyPrice && downPayment) {
      // Calculate actual down payment amount based on type
      let actualDownPayment = parseFloat(downPayment)
      if (downPaymentType === 'percentage') {
        actualDownPayment = (parseFloat(propertyPrice) * parseFloat(downPayment)) / 100
      }

      // Calculate loan amount: Property Price - Down Payment
      const calculatedLoanAmount = parseFloat(propertyPrice) - actualDownPayment

      // Only update if the calculated amount is valid and positive
      if (calculatedLoanAmount >= 0) {
        setLoanAmount(calculatedLoanAmount.toFixed(2))
      }
    } else if (propertyPrice && !downPayment) {
      // If only property price is set, loan amount equals property price
      setLoanAmount(propertyPrice)
    }
  }, [propertyPrice, downPayment, downPaymentType])

  // Rotate through feedback every 5 seconds
  useEffect(() => {
    if (allFeedback.length > 1) {
      const interval = setInterval(() => {
        setCurrentFeedbackIndex((prevIndex) =>
          (prevIndex + 1) % allFeedback.length
        )
      }, 5000) // Change feedback every 5 seconds

      return () => clearInterval(interval)
    }
  }, [allFeedback])

  // Auto-calculate when inputs change
  useEffect(() => {
    if (autoCalculate && interestRate && loanTerm) {
      const timeoutId = setTimeout(() => {
        calculateMortgage()
      }, 1000) // Debounce: wait 1 second after last change
      
      return () => clearTimeout(timeoutId)
    }
  }, [propertyPrice, downPayment, loanAmount, interestRate, loanTerm, propertyTax, insurance, hoaFees, autoCalculate])

  const calculateMortgage = async () => {
    setLoading(true)
    setError(null)

    // Calculate actual down payment amount based on type
    let actualDownPayment = downPayment
    if (downPaymentType === 'percentage' && propertyPrice && downPayment) {
      actualDownPayment = (parseFloat(propertyPrice) * parseFloat(downPayment)) / 100
    }

    try {
      const response = await fetch(`${API_URL}/api/calculate-mortgage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyPrice,
          downPayment: actualDownPayment,
          loanAmount,
          interestRate,
          loanTerm,
          propertyTax,
          insurance,
          hoaFees
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate mortgage')
      }

      if (data.success) {
        setResults(data.results)
      }
    } catch (err) {
      setError(err.message)
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Compare 15-year vs 30-year loans
  const compareLoans = async () => {
    setLoading(true)

    // Calculate actual down payment amount based on type
    let actualDownPayment = downPayment
    if (downPaymentType === 'percentage' && propertyPrice && downPayment) {
      actualDownPayment = (parseFloat(propertyPrice) * parseFloat(downPayment)) / 100
    }

    try {
      // Calculate for 15 years
      const response15 = await fetch(`${API_URL}/api/calculate-mortgage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyPrice, downPayment: actualDownPayment, loanAmount, interestRate,
          loanTerm: '15', propertyTax, insurance, hoaFees
        })
      })
      const data15 = await response15.json()

      // Calculate for 30 years
      const response30 = await fetch(`${API_URL}/api/calculate-mortgage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyPrice, downPayment: actualDownPayment, loanAmount, interestRate,
          loanTerm: '30', propertyTax, insurance, hoaFees
        })
      })
      const data30 = await response30.json()

      if (data15.success && data30.success) {
        setComparisonResults({
          year15: data15.results,
          year30: data30.results
        })
        setShowComparison(true)
      }
    } catch (err) {
      alert('Error comparing loans: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Save current scenario to database
  const saveScenario = async () => {
    if (!currentUser) {
      alert('Please login to save scenarios')
      setShowLoginModal(true)
      return
    }
    if (!isVerified) {
      alert('Please verify your email before saving scenarios')
      setShowVerificationModal(true)
      return
    }
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name')
      return
    }
    if (!results) {
      alert('Please calculate first before saving')
      return
    }

    const scenario = {
      id: Date.now(),
      name: scenarioName,
      date: new Date().toLocaleString(),
      inputs: { propertyPrice, downPayment, loanAmount, interestRate, loanTerm, propertyTax, insurance, hoaFees },
      results: results
    }

    try {
      // Get current user data
      const getResponse = await fetch(`${API_URL}/api/userdata/${currentUser}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      const getData = await getResponse.json()
      
      if (getResponse.status === 401 || getResponse.status === 403) {
        handleLogout()
        alert('Session expired. Please login again.')
        return
      }
      
      let scenarios = []
      if (getData.success && getData.data && getData.data.scenarios) {
        scenarios = getData.data.scenarios
      }
      
      // Add new scenario
      scenarios.push(scenario)
      
      // Save updated scenarios to database
      const saveResponse = await fetch(`${API_URL}/api/userdata/${currentUser}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ data: { scenarios } })
      })
      
      const saveData = await saveResponse.json()
      if (saveData.success) {
        setSavedScenarios(scenarios)
        setScenarioName('')
        alert('Scenario saved successfully!')
      } else {
        alert('Failed to save scenario')
      }
    } catch (error) {
      console.error('Error saving scenario:', error)
      alert('Error saving scenario')
    }
  }

  // Load user scenarios from database
  const loadUserScenarios = async () => {
    if (!currentUser || !authToken) return
    
    try {
      const response = await fetch(`${API_URL}/api/userdata/${currentUser}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      const data = await response.json()
      
      if (data.success && data.data && data.data.scenarios) {
        setSavedScenarios(data.data.scenarios)
      } else if (response.status === 401 || response.status === 403) {
        // Token expired or invalid
        handleLogout()
        alert('Session expired. Please login again.')
      }
    } catch (error) {
      console.error('Error loading scenarios:', error)
    }
  }

  // Load saved scenario
  const loadScenario = (scenario) => {
    setPropertyPrice(scenario.inputs.propertyPrice)
    setDownPayment(scenario.inputs.downPayment)
    setLoanAmount(scenario.inputs.loanAmount)
    setInterestRate(scenario.inputs.interestRate)
    setLoanTerm(scenario.inputs.loanTerm)
    setPropertyTax(scenario.inputs.propertyTax)
    setInsurance(scenario.inputs.insurance)
    setHoaFees(scenario.inputs.hoaFees)
    setResults(scenario.results)
  }

  // Delete saved scenario from database
  const deleteScenario = async (id) => {
    if (!currentUser || !authToken) return
    
    const updatedScenarios = savedScenarios.filter(s => s.id !== id)
    
    try {
      const response = await fetch(`${API_URL}/api/userdata/${currentUser}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ data: { scenarios: updatedScenarios } })
      })
      
      if (response.status === 401 || response.status === 403) {
        handleLogout()
        alert('Session expired. Please login again.')
        return
      }
      
      const data = await response.json()
      if (data.success) {
        setSavedScenarios(updatedScenarios)
      }
    } catch (error) {
      console.error('Error deleting scenario:', error)
    }
  }

  // Print results
  const printResults = () => {
    window.print()
  }

  // Download as PDF (using browser print to PDF)
  const downloadPDF = () => {
    alert('Use your browser\'s Print function (Ctrl+P or Cmd+P) and select "Save as PDF" as the destination.')
    window.print()
  }

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('username')
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    
    // Reset user session
    setCurrentUser(null)
    setAuthToken(null)
    setUserAppointments([])
    setLoginData({ email: '', password: '' })
    setSignupData({ email: '', username: '', password: '' })
    setIsVerified(true) // Reset verification status
    setVerificationEmail('')
    setVerificationCode('')
    
    // Reset calculator inputs
    setPropertyPrice('')
    setDownPayment('')
    setLoanAmount('')
    setInterestRate('')
    setLoanTerm('30')
    setPropertyTax('')
    setInsurance('')
    setHoaFees('')
    
    // Reset calculator results
    setResults(null)
    setLoading(false)
    setError(null)
    
    // Reset scenarios
    setSavedScenarios([])
    setScenarioName('')
    
    // Reset comparison
    setComparisonResults(null)
    setShowComparison(false)
    
    // Reset views
    setCurrentView(null)
    setScheduleView('yearly')
    setAutoCalculate(false)
    
    // Reset modals
    setShowLoginModal(false)
    setShowSignupModal(false)
    setShowFeedbackModal(false)
    setFeedbackData({ rating: 5, feedback: '' })

    // Reset FAQ
    setOpenFaqItems(new Set())
  }

  return (
    <div className="mortgage-calculator">
      {/* Hero Section with Background Video - Only show on homepage */}
      {!currentView && (
        <div className="hero-section">
          {/* Hero Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="hero-background-video"
          >
            <source src="/hero_video/mortgage_mainscreen.mp4" type="video/mp4" />
          </video>
          
          {/* Hero Content Overlay */}
          <div className="hero-content">
            {/* Welcome Header */}
            <div className="welcome-header">
              <img src="/WebsiteLOGO.png" alt="MortEdge Logo" className="website-logo" />
              <h1 className="welcome-title">
                WELCOME TO <span className="brand-mortg">MORTG</span><span className="brand-edge">EDGE</span>
              </h1>
            </div>
          </div>
        </div>
      )}

      {/* Account Section - Only show on homepage */}
      {!currentView && (
      <div className="account-section">
        {!currentUser ? (
          <>
            <button className="account-btn signup-btn" onClick={() => setShowSignupModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Sign Up
            </button>
            <button className="account-btn login-btn" onClick={() => setShowLoginModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Login
            </button>
          </>
        ) : (
          <button className="account-btn logout-btn" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout ({currentUser})
          </button>
        )}
      </div>
      )}

      {/* Professional User Profile Dropdown */}
      {currentUser && (
        <div className="user-profile-container">
          <div 
            className="user-profile-trigger" 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser}</span>
              <span className="user-status">{isVerified ? '✓ Verified' : '⚠ Not Verified'}</span>
            </div>
            <svg 
              className={`dropdown-arrow ${showUserDropdown ? 'open' : ''}`}
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          {showUserDropdown && (
            <div className="user-dropdown-menu">
              <div className="user-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Profile</span>
              </div>
              <div className="user-menu-item">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6"/>
                  <path d="M1 12h6m6 0h6"/>
                </svg>
                <span>Settings</span>
              </div>
              <div className="user-menu-divider"></div>
              <div className="user-menu-item" onClick={handleLogout}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Professional User Profile Dropdown */}
      {currentUser && (
        <div className="user-profile-container">
          <div 
            className="user-profile-trigger" 
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div className="user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser}</span>
              <span className="user-status">{isVerified ? '✓ Verified' : '⚠ Not Verified'}</span>
            </div>
            <svg 
              className={`dropdown-arrow ${showUserDropdown ? 'open' : ''}`}
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          
          {showUserDropdown && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-avatar">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="dropdown-user-details">
                  <h4>{currentUser}</h4>
                  <p>{localStorage.getItem('userEmail') || 'No email available'}</p>
                </div>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-stats">
                <div className="stat-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <div>
                    <span className="stat-value">{userAppointments.length}</span>
                    <span className="stat-label">Appointments</span>
                  </div>
                </div>
                <div className="stat-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  <div>
                    <span className="stat-value">{savedScenarios.length}</span>
                    <span className="stat-label">Saved Scenarios</span>
                  </div>
                </div>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-actions">
                <button className="dropdown-item" onClick={() => {
                  setShowUserDropdown(false)
                  handleNavClick('appointments')
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
                
                <button className="dropdown-item" onClick={() => {
                  setShowUserDropdown(false)
                  setCurrentView('calculator')
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span>Calculator</span>
                </button>
                
                {!isVerified && (
                  <button className="dropdown-item warning" onClick={() => {
                    setShowUserDropdown(false)
                    setShowVerificationModal(true)
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Verify Email</span>
                  </button>
                )}
                
                <button className="dropdown-item logout" onClick={() => {
                  setShowUserDropdown(false)
                  handleLogout()
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <h2 className="modal-title">Login to Your Account</h2>
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button type="submit" className="auth-submit-btn">Login</button>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSignupModal(false)}>×</button>
            <h2 className="modal-title">Create Your Account</h2>
            <form onSubmit={handleSignup} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={signupData.username}
                  onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                  required
                  placeholder="Choose a username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  required
                  placeholder="Create a password"
                />
              </div>
              <button type="submit" className="auth-submit-btn">Sign Up</button>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>×</button>
            <h2 className="modal-title">Share Your Experience</h2>
            <p className="feedback-subtitle">Help others by sharing your experience with MortgEdge</p>
            <form onSubmit={handleFeedbackSubmit} className="feedback-form">
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-stars-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${feedbackData.rating >= star ? 'active' : ''}`}
                      onClick={() => setFeedbackData({ ...feedbackData, rating: star })}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="feedback">Your Review</label>
                <textarea
                  id="feedback"
                  value={feedbackData.feedback}
                  onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })}
                  placeholder="Tell us about your experience..."
                  rows="5"
                  required
                />
              </div>
              <button type="submit" className="submit-btn">Submit Review</button>
            </form>
          </div>
        </div>
      )}

      {/* Email Verification Modal - Cannot be closed if pending verification */}
      {showVerificationModal && (
        <div className="modal-overlay">
          <div className="modal-content verification-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Verify Your Email</h2>
            <p className="feedback-subtitle">We sent a 6-digit code to {verificationEmail}</p>
            <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '15px', textAlign: 'center' }}>
              ⚠️ You must verify your email to access your account
            </p>
            <form onSubmit={handleVerifyEmail} className="verification-form">
              <div className="form-group">
                <label>Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
                />
              </div>
              <button type="submit" className="auth-submit-btn">Verify Email</button>
              <button 
                type="button" 
                className="resend-btn" 
                onClick={handleResendVerification}
                style={{ marginTop: '10px' }}
              >
                Resend Code
              </button>
            </form>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '15px', textAlign: 'center' }}>
              Code expires in 10 minutes. Check your spam folder if you don't see the email.
            </p>
            <button 
              type="button" 
              onClick={() => {
                setShowVerificationModal(false)
                setPendingUser(null)
                setVerificationEmail('')
                setVerificationCode('')
              }}
              style={{ 
                marginTop: '15px', 
                background: 'none', 
                border: 'none', 
                color: '#666', 
                cursor: 'pointer',
                fontSize: '12px',
                textDecoration: 'underline'
              }}
            >
              Cancel and go back
            </button>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && selectedTeamMember && (
        <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
          <div className="modal-content appointment-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAppointmentModal(false)}>×</button>
            <h2 className="modal-title">Schedule Consultation</h2>
            <p className="modal-subtitle">Book an appointment with {selectedTeamMember.name}</p>
            
            <form onSubmit={handleAppointmentSubmit} className="appointment-form">
              <div className="form-group">
                <label>Your Name *</label>
                <input
                  type="text"
                  value={appointmentData.userName}
                  onChange={(e) => setAppointmentData({ ...appointmentData, userName: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={appointmentData.userEmail}
                  onChange={(e) => setAppointmentData({ ...appointmentData, userEmail: e.target.value })}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={appointmentData.userPhone}
                  onChange={(e) => setAppointmentData({ ...appointmentData, userPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Appointment Date *</label>
                  <input
                    type="date"
                    value={appointmentData.appointmentDate}
                    onChange={(e) => setAppointmentData({ ...appointmentData, appointmentDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Preferred Time *</label>
                  <select
                    value={appointmentData.appointmentTime}
                    onChange={(e) => setAppointmentData({ ...appointmentData, appointmentTime: e.target.value })}
                    required
                  >
                    <option value="">Select time</option>
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="01:00 PM">01:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:00 PM">05:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={appointmentData.notes}
                  onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                  placeholder="Any specific topics or questions you'd like to discuss?"
                  rows="3"
                />
              </div>

              <div className="appointment-info">
                <p>📍 Meeting with: <strong>{selectedTeamMember.name}</strong></p>
                <p>📧 Contact: 
                  <a 
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedTeamMember.contact.email}&su=Mortgage Consultation Inquiry&body=Hi ${selectedTeamMember.name},%0D%0A%0D%0AI would like to discuss mortgage options.%0D%0A%0D%0AThank you!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#2563eb', textDecoration: 'none', marginLeft: '5px' }}
                  >
                    <strong>{selectedTeamMember.contact.email}</strong>
                  </a>
                </p>
                <p>📞 Phone: <strong>{selectedTeamMember.contact.phone}</strong></p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAppointmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hero Background Videos for each section with Navigation Bar on top */}
      {currentView === 'calculator' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/calculator.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
              <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
      {currentView === 'team' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/brokers_and_agents.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
                    <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
      {currentView === 'rates' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/rates.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
              <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
      {currentView === 'news-events' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/news_and_events.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
              <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Learning Center Hero Video */}
      {currentView === 'educational-content' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/Learning_center_hero_background.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
              <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Locations Hero Video */}
      {currentView === 'locations' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/Location_hero_background.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
              <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* World Chat Hero Video */}
      {currentView === 'world-chat' && (
        <div className="hero-video-container">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            preload="auto"
            className="hero-video"
            onLoadedData={(e) => e.target.classList.add('loaded')}
          >
            <source src="/hero_video/world_chat_hero_images.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
          <div className="nav-and-image-container">
            <nav className="navigation-bar">
              <button 
                className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
                onClick={() => handleNavClick('calculator')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2"/>
                  <line x1="8" y1="6" x2="16" y2="6"/>
                  <line x1="8" y1="10" x2="16" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="16" y2="18"/>
                </svg>
                <span>Calculator</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
                onClick={() => handleNavClick('team')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Brokers and Agents</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                  onClick={() => handleNavClick('appointments')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
                </button>
              )}

              <button
                className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
                onClick={() => handleNavClick('rates')}
              >
                <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
                <span>Our Rates</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
                onClick={() => handleNavClick('news-events')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                </svg>
                <span>News & Events</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
                onClick={() => handleNavClick('educational-content')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Learning Center</span>
              </button>

              <button 
                className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
                onClick={() => handleNavClick('locations')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Locations</span>
              </button>

              {currentUser && (
                <button 
                  className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                  onClick={() => handleNavClick('world-chat')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>World Chat</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Navigation Bar for homepage and sections without video backgrounds */}
      {(!currentView || !['calculator', 'team', 'rates', 'news-events', 'educational-content', 'locations', 'world-chat'].includes(currentView)) && (
        <div className="nav-and-image-container">
          <nav className="navigation-bar">
            <button 
              className={`nav-item ${currentView === 'calculator' ? 'active' : ''}`}
              onClick={() => handleNavClick('calculator')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2"/>
                <line x1="8" y1="6" x2="16" y2="6"/>
                <line x1="8" y1="10" x2="16" y2="10"/>
                <line x1="8" y1="14" x2="16" y2="14"/>
                <line x1="8" y1="18" x2="16" y2="18"/>
              </svg>
              <span>Calculator</span>
            </button>

            <button 
              className={`nav-item ${currentView === 'team' ? 'active' : ''}`}
              onClick={() => handleNavClick('team')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Brokers and Agents</span>
            </button>

            {currentUser && (
              <button 
                className={`nav-item ${currentView === 'appointments' ? 'active' : ''}`}
                onClick={() => handleNavClick('appointments')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>My Appointments {userAppointments.length > 0 && `(${userAppointments.length})`}</span>
              </button>
            )}

            <button
              className={`nav-item ${currentView === 'rates' ? 'active' : ''}`}
              onClick={() => handleNavClick('rates')}
            >
              <span style={{ fontSize: '1.7em', fontWeight: 'bold', marginRight: '6px' }}>%</span>
              <span>Our Rates</span>
            </button>

            <button 
              className={`nav-item ${currentView === 'news-events' ? 'active' : ''}`}
              onClick={() => handleNavClick('news-events')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
              <span>News & Events</span>
            </button>

            <button 
              className={`nav-item ${currentView === 'educational-content' ? 'active' : ''}`}
              onClick={() => handleNavClick('educational-content')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span>Learning Center</span>
            </button>

            <button 
              className={`nav-item ${currentView === 'locations' ? 'active' : ''}`}
              onClick={() => handleNavClick('locations')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Locations</span>
            </button>

            {currentUser && (
              <button 
                className={`nav-item ${currentView === 'world-chat' ? 'active' : ''}`}
                onClick={() => handleNavClick('world-chat')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>World Chat</span>
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Default Image when no view is selected */}
      {/* Homepage Content Container for Desktop Layout */}
      {currentView === null && (
        <div className="homepage-content-wrapper">
          {/* Google Reviews Widget - Only show on homepage */}
          {allFeedback.length > 0 && (
        <div className="feedback-widget">
          <div className="feedback-widget-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="google-logo">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div className="feedback-header-text">
              <span className="google-reviews-title">Google Reviews</span>
              <div className="google-overall-rating">
                <span className="google-rating-number">4.9</span>
                <div className="google-stars-small">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="#FBBC05"
                      stroke="none"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  ))}
                </div>
                <span className="google-review-count">({allFeedback.length} reviews)</span>
              </div>
            </div>
            <button
              className="add-review-btn"
              onClick={() => {
                if (!currentUser) {
                  setShowLoginModal(true)
                } else {
                  setShowFeedbackModal(true)
                }
              }}
              title="Add your review"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
            <button
              className="see-more-btn"
              onClick={() => setShowFeedbackBody(!showFeedbackBody)}
              title={showFeedbackBody ? "See Less" : "See More"}
            >
              {showFeedbackBody ? "See Less" : "See More"}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                style={{ transform: showFeedbackBody ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
          {showFeedbackBody && (
            <div className="feedback-widget-content">
              <div className="feedback-inner-box">
                <div className="feedback-header-row">
                  <div className="feedback-profile">
                    <div className="feedback-avatar">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div className="feedback-user-info">
                      <p className="feedback-author">{allFeedback[currentFeedbackIndex].username}</p>
                      <p className="feedback-date">{new Date(allFeedback[currentFeedbackIndex].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="feedback-stars">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={i < allFeedback[currentFeedbackIndex].rating ? "#FBBC05" : "none"}
                        stroke={i < allFeedback[currentFeedbackIndex].rating ? "none" : "#FBBC05"}
                        strokeWidth="1"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="feedback-text">{allFeedback[currentFeedbackIndex].feedback}</p>
                <a
                  href="https://www.google.com/search?q=your+business+reviews"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-posted-badge"
                >
                  Posted on Google
                </a>
              </div>
            </div>
          )}
        </div>
          )}
          {allFeedback.length === 0 && (
        <div className="feedback-widget feedback-widget-empty">
          <div className="feedback-widget-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="google-logo">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div className="feedback-header-text">
              <span className="google-reviews-title">Google Reviews</span>
              <div className="google-overall-rating">
                <span className="google-rating-number">Be the first!</span>
              </div>
            </div>
            <button
              className="add-review-btn"
              onClick={() => {
                if (!currentUser) {
                  setShowLoginModal(true)
                } else {
                  setShowFeedbackModal(true)
                }
              }}
              title="Add your review"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
          )}

          {/* Default layout with image and qualifier */}
        <div className="default-layout">
          <div className="default-image-container">
            <img src="/Toronto.jpg" alt="Toronto" className="default-image" />
          </div>
          
          {/* Mortgage Qualifier Calculator */}
          <div className="qualifier-container">
            <MortgageQualifier economicData={economicData} />
          </div>
        </div>
        </div>
      )}

      {/* Our Lenders Section - Only show when no navigation item is selected */}
      {!currentView && (
        <div className="our-lenders-section">
          <h2 className="lenders-title">Our Lenders</h2>
          <div className="lenders-container">
            <div className="lenders-track">
              <img src="/lenders/Royal-Bank-of-Canada-Logo.png" alt="Royal Bank of Canada" className="lender-logo" />
              <img src="/lenders/BMO-logo.webp" alt="BMO" className="lender-logo" />
              <img src="/lenders/1762724100628.png" alt="Lender" className="lender-logo" />
              <img src="/lenders/1762724210186.png" alt="Lender" className="lender-logo" />
              <img src="/lenders/lender.png" alt="Lender" className="lender-logo" />
              {/* Duplicate for seamless loop */}
              <img src="/lenders/Royal-Bank-of-Canada-Logo.png" alt="Royal Bank of Canada" className="lender-logo" />
              <img src="/lenders/BMO-logo.webp" alt="BMO" className="lender-logo" />
              <img src="/lenders/1762724100628.png" alt="Lender" className="lender-logo" />
              <img src="/lenders/1762724210186.png" alt="Lender" className="lender-logo" />
              <img src="/lenders/lender.png" alt="Lender" className="lender-logo" />
            </div>
          </div>
        </div>
      )}

      <div className="features-container">
        {currentView === 'calculator' ? (
        <>
          <div className="calculator-header-left">
            <h2 className="feature-title">Mortgage Calculator</h2>
            <p className="feature-description">
              Calculate your monthly mortgage payment and see how much you'll pay over the life of your loan.
            </p>
          </div>
          <div className="calculator-form">
        <div className="input-group">
          <label htmlFor="propertyPrice">Property Price ($)</label>
          <input
            type="number"
            id="propertyPrice"
            value={propertyPrice}
            onChange={(e) => setPropertyPrice(e.target.value)}
            placeholder="Enter property price"
          />
        </div>

        <div className="input-group">
          <div className="label-with-toggle">
            <label htmlFor="downPayment">
              Down Payment {downPaymentType === 'amount' ? '($)' : '(%)'}
            </label>
            <div className="toggle-buttons">
              <button
                type="button"
                className={`toggle-btn ${downPaymentType === 'amount' ? 'active' : ''}`}
                onClick={() => setDownPaymentType('amount')}
              >
                $
              </button>
              <button
                type="button"
                className={`toggle-btn ${downPaymentType === 'percentage' ? 'active' : ''}`}
                onClick={() => setDownPaymentType('percentage')}
              >
                %
              </button>
            </div>
          </div>
          <input
            type="number"
            id="downPayment"
            value={downPayment}
            onChange={(e) => {
              const value = e.target.value
              // If percentage mode, limit to 100
              if (downPaymentType === 'percentage' && parseFloat(value) > 100) {
                setDownPayment('100')
              } else {
                setDownPayment(value)
              }
            }}
            placeholder={downPaymentType === 'amount' ? 'Enter dollar amount' : 'Enter percentage (e.g., 20)'}
            step={downPaymentType === 'percentage' ? '0.1' : '1'}
            min="0"
            max={downPaymentType === 'percentage' ? '100' : undefined}
          />
          <p className="input-hint">
            {downPaymentType === 'amount'
              ? 'The amount you\'ll pay upfront. Typically 3-20% of the property price.'
              : 'The percentage of the property price you\'ll pay upfront. Typically 3-20%.'}
          </p>
        </div>

        <div className="input-group">
          <label htmlFor="loanAmount">Loan Amount ($) <span className="auto-label">(Auto-calculated)</span></label>
          <input
            type="number"
            id="loanAmount"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            placeholder="Calculated automatically"
            readOnly
          />
          <p className="input-hint">The amount you're borrowing from the lender. This equals Property Price minus Down Payment (calculated automatically).</p>
        </div>

        <div className="input-group">

        <label htmlFor="interestRate">Interest Rate (% per year)</label>
        <input
          type="number"
          id="interestRate"
          step="0.01"
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
          placeholder="Enter interest rate"
        />
        </div>

        <div className="input-group">
          <label htmlFor="loanTerm">Loan Term (years)</label>
          <input
            type="number"
            id="loanTerm"
            min="1"
            max="50"
            value={loanTerm}
            onChange={(e) => setLoanTerm(e.target.value)}
            placeholder="Enter loan term (1-50 years)"
          />
        </div>

        {/* Additional Costs Section */}
        <div className="additional-costs-section">
          <div className="additional-costs-inputs-container">
            <h3>Additional Costs (Optional)</h3>
            <p className="section-description">These costs are added to your monthly payment but don't affect the loan principal or interest calculations.</p>
            <div className="input-group">
              <label htmlFor="propertyTax">Property Tax ($ per month)</label>
              <input
                type="number"
                id="propertyTax"
                value={propertyTax}
                onChange={(e) => setPropertyTax(e.target.value)}
                placeholder="Enter monthly property tax"
              />
            </div>
            <div className="input-group">
              <label htmlFor="insurance">Homeowners Insurance ($ per month)</label>
              <input
                type="number"
                id="insurance"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                placeholder="Enter monthly insurance"
              />
            </div>
            <div className="input-group">
              <label htmlFor="hoaFees">HOA Fees ($ per month)</label>
              <input
                type="number"
                id="hoaFees"
                value={hoaFees}
                onChange={(e) => setHoaFees(e.target.value)}
                placeholder="Enter monthly HOA fees"
              />
            </div>
          </div>
        </div>

        <button 
          className="calculate-btn" 
          onClick={calculateMortgage}
          disabled={loading}
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>

        {/* Additional Action Buttons */}
        <div className="action-buttons">
          <button 
            className="action-btn compare-btn" 
            onClick={compareLoans}
            disabled={loading}
          >
            📊 Compare 15yr vs 30yr
          </button>
          
          {results && (
            <>
              <button className="action-btn print-btn" onClick={printResults}>
                🖨️ Print Results
              </button>
              <button className="action-btn pdf-btn" onClick={downloadPDF}>
                📄 Download PDF
              </button>
            </>
          )}
        </div>

        {/* Auto-Calculate Toggle */}
        <div className="auto-calculate-toggle">
          <label>
            <input 
              type="checkbox" 
              checked={autoCalculate}
              onChange={(e) => setAutoCalculate(e.target.checked)}
            />
            <span>Auto-calculate on input change</span>
          </label>
        </div>

        {/* Save Scenario Section */}
        {results && (
          <div className="save-scenario">
            <h4>💾 Save This Scenario {!currentUser && <span style={{fontSize: '0.8rem', color: '#fbbf24'}}>(Login Required)</span>}</h4>
            <div className="save-input-group">
              <input
                type="text"
                placeholder={currentUser ? "Enter scenario name (e.g., 'Dream House Option 1')" : "Login to save scenarios"}
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="scenario-name-input"
                disabled={!currentUser}
              />
              <button className="save-btn" onClick={saveScenario} disabled={!currentUser}>
                Save
              </button>
            </div>
          </div>
        )}

        {/* Saved Scenarios */}
        {savedScenarios.length > 0 && (
          <div className="saved-scenarios">
            <h4>📁 Saved Scenarios</h4>
            <div className="scenarios-list">
              {savedScenarios.map((scenario) => (
                <div key={scenario.id} className="scenario-item">
                  <div className="scenario-info">
                    <strong>{scenario.name}</strong>
                    <span className="scenario-date">{scenario.date}</span>
                    <span className="scenario-preview">
                      ${parseFloat(scenario.inputs.loanAmount || scenario.inputs.propertyPrice).toLocaleString()} 
                      @ {scenario.inputs.interestRate}% for {scenario.inputs.loanTerm} years
                    </span>
                  </div>
                  <div className="scenario-actions">
                    <button onClick={() => loadScenario(scenario)} className="load-btn">
                      Load
                    </button>
                    <button onClick={() => deleteScenario(scenario.id)} className="delete-btn">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {showComparison && comparisonResults && (
        <div className="comparison-section">
          <div className="comparison-header">
            <h2>📊 Loan Comparison: 15-Year vs 30-Year</h2>
            <button className="close-comparison" onClick={() => setShowComparison(false)}>×</button>
          </div>
          <p className="comparison-intro">
            See the key differences between a 15-year and 30-year mortgage with the same loan amount and interest rate.
          </p>

          <div className="comparison-grid">
            <div className="comparison-card">
              <h3>15-Year Loan</h3>
              <div className="comparison-item">
                <span className="label">Monthly Payment:</span>
                <span className="value">${parseFloat(comparisonResults.year15.monthlyPayment).toLocaleString()}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Total Interest:</span>
                <span className="value">${parseFloat(comparisonResults.year15.totalInterest).toLocaleString()}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Total Paid:</span>
                <span className="value">${parseFloat(comparisonResults.year15.totalPaid).toLocaleString()}</span>
              </div>
            </div>

            <div className="comparison-card">
              <h3>30-Year Loan</h3>
              <div className="comparison-item">
                <span className="label">Monthly Payment:</span>
                <span className="value">${parseFloat(comparisonResults.year30.monthlyPayment).toLocaleString()}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Total Interest:</span>
                <span className="value">${parseFloat(comparisonResults.year30.totalInterest).toLocaleString()}</span>
              </div>
              <div className="comparison-item">
                <span className="label">Total Paid:</span>
                <span className="value">${parseFloat(comparisonResults.year30.totalPaid).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="comparison-summary">
            <h4>💡 What This Means</h4>
            <p><strong>Monthly Payment Difference:</strong> The 15-year loan has ${(parseFloat(comparisonResults.year15.monthlyPayment) - parseFloat(comparisonResults.year30.monthlyPayment)).toLocaleString()} higher monthly payments.</p>
            <p><strong>Interest Savings:</strong> By choosing the 15-year loan, you'll save ${(parseFloat(comparisonResults.year30.totalInterest) - parseFloat(comparisonResults.year15.totalInterest)).toLocaleString()} in total interest!</p>
            <p><strong>Trade-off:</strong> Higher monthly payments mean faster equity building and significant long-term savings, but require more cash flow today.</p>
          </div>
        </div>
      )}

      {results && (
        <div className="results-section">
          <h2>Your Mortgage Breakdown</h2>
          <p className="results-intro">
            Based on your inputs, here's what your mortgage will look like. These calculations help you understand 
            the true cost of your home loan over time.
          </p>
          
          <div className="result-card primary">
            <h3>Monthly Payment (Principal & Interest)</h3>
            <div className="amount">${parseFloat(results.monthlyPayment).toLocaleString()}</div>
            <p className="detail">This is your base monthly payment that goes toward paying off the loan and interest charges.</p>
          </div>

          {parseFloat(results.additionalCosts) > 0 && (
            <div className="result-card">
              <h3>Total Monthly Payment (Including Additional Costs)</h3>
              <div className="amount">${parseFloat(results.totalMonthlyPayment).toLocaleString()}</div>
              <p className="detail">This is your actual monthly payment including property tax (${parseFloat(propertyTax || 0).toLocaleString()}), 
              insurance (${parseFloat(insurance || 0).toLocaleString()}), and HOA fees (${parseFloat(hoaFees || 0).toLocaleString()}).</p>
            </div>
          )}

          <div className="results-grid">
            <div className="result-card">
              <h3>Total Interest Paid</h3>
              <div className="amount">${parseFloat(results.totalInterest).toLocaleString()}</div>
              <p className="detail">Over {loanTerm} years, you'll pay this much in interest charges. This is the cost of borrowing money.</p>
            </div>

            <div className="result-card">
              <h3>Total Amount Paid</h3>
              <div className="amount">${parseFloat(results.totalPaid).toLocaleString()}</div>
              <p className="detail">The total you'll pay over the life of the loan: ${parseFloat(results.principal).toLocaleString()} (principal) + 
              ${parseFloat(results.totalInterest).toLocaleString()} (interest).</p>
            </div>
          </div>

          <div className="result-card">
            <h3>First Payment Breakdown</h3>
            <p className="detail" style={{marginBottom: '1rem'}}>
              Early in your loan, most of your payment goes to interest. Over time, more goes toward principal. 
              Here's how your first monthly payment of ${parseFloat(results.monthlyPayment).toLocaleString()} breaks down:
            </p>
            <div className="breakdown">
              <div className="breakdown-item">
                <span className="label">Principal (pays down loan balance):</span>
                <span className="value">${parseFloat(results.firstMonthPrincipal).toLocaleString()}</span>
              </div>
              <div className="breakdown-item">
                <span className="label">Interest (cost to lender):</span>
                <span className="value">${parseFloat(results.firstMonthInterest).toLocaleString()}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-principal" 
                style={{
                  width: `${(parseFloat(results.firstMonthPrincipal) / parseFloat(results.monthlyPayment) * 100).toFixed(1)}%`
                }}
                title={`Principal: ${(parseFloat(results.firstMonthPrincipal) / parseFloat(results.monthlyPayment) * 100).toFixed(1)}%`}
              >
                {(parseFloat(results.firstMonthPrincipal) / parseFloat(results.monthlyPayment) * 100).toFixed(1)}%
              </div>
              <div 
                className="progress-interest" 
                style={{
                  width: `${(parseFloat(results.firstMonthInterest) / parseFloat(results.monthlyPayment) * 100).toFixed(1)}%`
                }}
                title={`Interest: ${(parseFloat(results.firstMonthInterest) / parseFloat(results.monthlyPayment) * 100).toFixed(1)}%`}
              >
                {(parseFloat(results.firstMonthInterest) / parseFloat(results.monthlyPayment) * 100).toFixed(1)}%
              </div>
            </div>
            <p className="progress-legend">
              <span className="legend-item"><span className="legend-color principal"></span> Principal</span>
              <span className="legend-item"><span className="legend-color interest"></span> Interest</span>
            </p>
          </div>

          <div className="result-card summary">
            <h3>Loan Summary</h3>
            <p className="detail" style={{marginBottom: '1rem'}}>Review your loan details to ensure everything is correct.</p>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Loan Amount:</span>
                <span className="value">${parseFloat(results.principal).toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="label">Interest Rate:</span>
                <span className="value">{interestRate}%</span>
              </div>
              <div className="summary-item">
                <span className="label">Loan Term:</span>
                <span className="value">{loanTerm} years</span>
              </div>
              {results.downPaymentPercent && (
                <div className="summary-item">
                  <span className="label">Down Payment:</span>
                  <span className="value">{results.downPaymentPercent}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Visualizations */}
          {results.amortizationSchedule && results.amortizationSchedule.length > 0 && (
            <>
              <div className="result-card visualization-card">
                <h3>📈 Payment Breakdown Over Time</h3>
                <p className="detail" style={{marginBottom: '1.5rem'}}>
                  See how your payments are split between principal and interest throughout the loan term.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={results.amortizationSchedule
                      .filter((_, index) => index % Math.ceil(results.amortizationSchedule.length / 20) === 0)
                      .map((item) => ({
                        month: item.paymentNumber,
                        Principal: parseFloat(item.principal),
                        Interest: parseFloat(item.interest)
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis dataKey="month" label={{ value: 'Payment Number', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Principal" stackId="a" fill="#4caf50" />
                    <Bar dataKey="Interest" stackId="a" fill="#ff9800" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-explanation">
                  <p><strong>What this shows:</strong> Each bar represents a mortgage payment at different points in your loan. The orange portion (top) is interest paid to the lender, while the green portion (bottom) reduces your loan balance.</p>
                  <p><strong>Key insight:</strong> Notice how early payments are mostly interest (large orange sections), but as time goes on, more of each payment goes toward principal (green grows larger). This is because interest is calculated on the remaining balance, which decreases over time.</p>
                </div>
              </div>

              <div className="result-card visualization-card">
                <h3>📉 Remaining Balance Over Time</h3>
                <p className="detail" style={{marginBottom: '1.5rem'}}>
                  Watch your loan balance decrease as you make payments over the years.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={results.amortizationSchedule
                      .filter((_, index) => index % 12 === 0 || index === 0 || index === results.amortizationSchedule.length - 1)
                      .map((item) => ({
                        year: Math.ceil(item.paymentNumber / 12),
                        balance: parseFloat(item.remainingBalance)
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                    <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Balance ($)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="balance" stroke="#646cff" strokeWidth={3} name="Remaining Balance" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="chart-explanation">
                  <p><strong>What this shows:</strong> This line represents how much you still owe on your mortgage at the end of each year. It starts at your original loan amount (${parseFloat(results.principal).toLocaleString()}) and drops to $0 when the loan is paid off.</p>
                  <p><strong>Key insight:</strong> The line may look like it drops slowly at first, then faster later. This happens because early payments go mostly toward interest, so your balance decreases slowly. As you pay down principal, more of each payment reduces the balance, creating the steeper decline toward the end.</p>
                </div>
              </div>

              <div className="result-card visualization-card">
                <h3>🥧 Total Cost Distribution</h3>
                <p className="detail" style={{marginBottom: '1.5rem'}}>
                  See the breakdown of your total loan cost over {loanTerm} years.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Principal', value: parseFloat(results.principal), color: '#4caf50' },
                        { name: 'Interest', value: parseFloat(results.totalInterest), color: '#ff9800' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#4caf50" />
                      <Cell fill="#ff9800" />
                    </Pie>
                    <Tooltip formatter={(value) => `$${parseFloat(value).toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-explanation">
                  <p><strong>What this shows:</strong> This pie chart breaks down the total amount you'll pay over the entire {loanTerm}-year loan period. The green slice is your principal (the actual amount you borrowed), and the orange slice is the total interest you'll pay to the lender.</p>
                  <p><strong>Key insight:</strong> The interest portion might be surprisingly large! Over {loanTerm} years, you'll pay ${parseFloat(results.totalInterest).toLocaleString()} in interest on top of your ${parseFloat(results.principal).toLocaleString()} loan. This is why making extra principal payments or choosing a shorter loan term can save you significant money.</p>
                </div>
                <div className="pie-summary">
                  <div className="pie-item">
                    <span className="pie-label">
                      <span className="pie-color" style={{background: '#4caf50'}}></span>
                      Principal (Loan Amount):
                    </span>
                    <span className="pie-value">${parseFloat(results.principal).toLocaleString()}</span>
                  </div>
                  <div className="pie-item">
                    <span className="pie-label">
                      <span className="pie-color" style={{background: '#ff9800'}}></span>
                      Total Interest Paid:
                    </span>
                    <span className="pie-value">${parseFloat(results.totalInterest).toLocaleString()}</span>
                  </div>
                  <div className="pie-item total">
                    <span className="pie-label">Total Cost:</span>
                    <span className="pie-value">${parseFloat(results.totalPaid).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Amortization Schedule */}
          {results.amortizationSchedule && results.amortizationSchedule.length > 0 && (
            <div className="result-card amortization-card">
              <h3>📊 Amortization Schedule</h3>
              <p className="detail" style={{marginBottom: '1rem'}}>
                This table shows how your payments are distributed between principal and interest over time.
              </p>
              
              <div className="schedule-controls">
                <button 
                  className={`schedule-btn ${scheduleView === 'monthly' ? 'active' : ''}`}
                  onClick={() => setScheduleView('monthly')}
                >
                  Monthly View
                </button>
                <button 
                  className={`schedule-btn ${scheduleView === 'yearly' ? 'active' : ''}`}
                  onClick={() => setScheduleView('yearly')}
                >
                  Yearly View
                </button>
              </div>

              <div className="schedule-table-container">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>{scheduleView === 'monthly' ? 'Month' : 'Year'}</th>
                      <th>Payment</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleView === 'monthly' 
                      ? results.amortizationSchedule.map((item) => (
                          <tr key={item.paymentNumber}>
                            <td>{item.paymentNumber}</td>
                            <td>${parseFloat(item.payment).toLocaleString()}</td>
                            <td>${parseFloat(item.principal).toLocaleString()}</td>
                            <td>${parseFloat(item.interest).toLocaleString()}</td>
                            <td>${parseFloat(item.remainingBalance).toLocaleString()}</td>
                          </tr>
                        ))
                      : results.amortizationSchedule
                          .filter((_, index) => (index + 1) % 12 === 0 || index === 0)
                          .map((item) => (
                            <tr key={item.paymentNumber}>
                              <td>{Math.ceil(item.paymentNumber / 12)}</td>
                              <td>${parseFloat(item.payment).toLocaleString()}</td>
                              <td>${parseFloat(item.principal).toLocaleString()}</td>
                              <td>${parseFloat(item.interest).toLocaleString()}</td>
                              <td>${parseFloat(item.remainingBalance).toLocaleString()}</td>
                            </tr>
                          ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="info-card">
            <h3>💡 Understanding Your Results</h3>
            <ul>
              <li><strong>Monthly Payment:</strong> This amount stays the same throughout your loan (fixed-rate mortgage).</li>
              <li><strong>Principal vs Interest:</strong> In early years, you pay mostly interest. Later, more goes toward principal.</li>
              <li><strong>Total Interest:</strong> Want to save? Make extra payments toward principal or choose a shorter loan term.</li>
              <li><strong>Additional Costs:</strong> Property taxes and insurance may increase over time, affecting your total monthly payment.</li>
            </ul>
          </div>
        </div>
      )}
      </>
      ) : currentView === 'news-events' ? (
        <div className="news-events-box">
          <h2 className="news-events-heading">
            <span style={{ color: '#3b82f6' }}>News</span> <span style={{ color: '#f97316' }}>and Events</span>
          </h2>
          <p className="news-events-subtitle">Stay informed with the latest mortgage news, market updates, and industry insights from trusted Canadian sources.</p>

          <div className="learning-articles-grid">
            {newsAndEvents.map((item) => (
              <a 
                key={item.id} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="learning-article-card"
              >
                {newsImageMap[item.id] && (
                  <div className="learning-article-image">
                    <img 
                      src={newsImageMap[item.id]} 
                      alt={item.title}
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="learning-article-content">
                  <div className="learning-article-header">
                    <span className="learning-article-category">{item.category}</span>
                    <span className="learning-article-source">{item.source}</span>
                  </div>
                  <h3 className="learning-article-title">{item.title}</h3>
                  <p className="learning-article-description">{item.description}</p>
                  <div className="learning-article-link">
                    <span>Read Article</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
        ) : currentView === 'educational-content' ? (
        <div className="feature-box educational-content-box">
          <h2 className="feature-title" style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '1rem' }}>Mortgage Learning Center</h2>
          <p className="section-description" style={{ textAlign: 'center', fontSize: '1.1rem', marginBottom: '3rem', color: '#000000' }}>Coming Soon</p>
        </div>
        ) : currentView === 'rates' ? (
        <MortgageRatesTable />
        ) : currentView === 'appointments' ? (
        <div className="feature-box appointments-box">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2 className="feature-title">My Upcoming Appointments</h2>
          <p className="section-description">View and manage your scheduled consultations with our team.</p>

          <div className="appointments-container">
            {userAppointments.length === 0 ? (
              <div className="no-appointments">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <h3>No Upcoming Appointments</h3>
                <p>You don't have any scheduled appointments at the moment.</p>
                <button 
                  className="schedule-now-btn"
                  onClick={() => handleNavClick('team')}
                >
                  Schedule a Consultation
                </button>
              </div>
            ) : (
              <div className="appointments-list">
                {userAppointments.map((appointment, index) => (
                  <div key={index} className={`appointment-card ${appointment.status}`}>
                    <div className="appointment-header">
                      <div className="appointment-status-badge">{appointment.status}</div>
                      <div className="appointment-date-time">
                        <div className="appointment-date">
                          📅 {new Date(appointment.appointmentDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="appointment-time">🕐 {appointment.appointmentTime}</div>
                      </div>
                    </div>
                    
                    <div className="appointment-body">
                      <div className="appointment-broker">
                        <h4>Meeting with {appointment.teamMemberName}</h4>
                      </div>
                      
                      {appointment.notes && (
                        <div className="appointment-notes">
                          <strong>Notes:</strong>
                          <p>{appointment.notes}</p>
                        </div>
                      )}
                      
                      <div className="appointment-contact">
                        <p>📧 Confirmation sent to: {appointment.userEmail}</p>
                        {appointment.userPhone && (
                          <p>📞 Contact: {appointment.userPhone}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="appointment-footer">
                      <button 
                        className="appointment-action-btn reschedule"
                        onClick={() => handleRescheduleAppointment(appointment)}
                        disabled={appointment.status === 'cancelled'}
                      >
                        Reschedule
                      </button>
                      <button 
                        className="appointment-action-btn cancel"
                        onClick={() => handleCancelAppointment(appointment._id)}
                        disabled={appointment.status === 'cancelled'}
                      >
                        {appointment.status === 'cancelled' ? 'Cancelled' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        ) : currentView === 'locations' ? (
        <Locations />
        ) : currentView === 'world-chat' ? (
        <div>
          {currentUser ? (
            <WorldChat user={{ username: currentUser }} />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h2>Please log in to access World Chat</h2>
              <button 
                className="cta-button" 
                onClick={() => setShowLoginModal(true)}
                style={{ marginTop: '20px' }}
              >
                Log In
              </button>
            </div>
          )}
        </div>
        ) : currentView === 'team' ? (
        <div className="team-section-container">
          <h2 className="team-section-title" style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: '700', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
            <span style={{ color: '#000000' }}>Meet Our </span>
            <span style={{ color: '#3b82f6' }}>Brokers</span>
            <span style={{ color: '#000000' }}> and </span>
            <span style={{ color: '#f97316' }}>Agents</span>
          </h2>
          <div className="team-cards-horizontal">
          <div className="team-member-card">
            <img src="/aman_pic.jpeg" alt="Broker" className="broker-photo" />
            <h2 className="broker-name">Aman Kushwaha</h2>
            <p className="broker-role">Mortgage Agent, Level 2</p>
            <p className="broker-info">License #: M22004330</p>
            <p className="broker-info">Email: aman.kushwaha@8twelve.mortgage</p>
            <p className="broker-info">Phone: (647) 327-6619</p>
            <div className="broker-actions">
              <button
                className="broker-btn schedule-btn"
                onClick={() => handleScheduleConsultation({
                  _id: 'broker-1',
                  name: 'Aman Kushwaha',
                  contact: {
                    email: 'aman.kushwaha@8twelve.mortgage',
                    phone: '(647) 327-6619'
                  }
                })}
              >
                Schedule a Meeting
              </button>
              <button
                className="broker-btn email-btn"
                onClick={() => window.open('https://mail.google.com/mail/?view=cm&fs=1&to=aman.kushwaha@8twelve.mortgage&su=Mortgage Consultation Inquiry', '_blank')}
              >
                Send an Email
              </button>
            </div>
          </div>
          </div>
        </div>
        ) : currentView === 'faq' ? (
        <div className="feature-box faq-box">
          <h2 className="feature-title">Frequently Asked Questions</h2>

          <div className="faq-container">
              <div className={`faq-item ${openFaqItems.has(0) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(0)}>
                  <h4>How long does the mortgage approval process take?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>The typical mortgage approval process takes <strong>15-30 days</strong> from application to closing. However, at MortgEdge, our streamlined process averages just <strong>15 days</strong>. The timeline depends on several factors:</p>
                  <ul>
                    <li><strong>Pre-approval:</strong> 1-3 business days</li>
                    <li><strong>Full application review:</strong> 3-5 business days</li>
                    <li><strong>Home appraisal:</strong> 5-10 business days</li>
                    <li><strong>Underwriting:</strong> 3-7 business days</li>
                    <li><strong>Clear to close:</strong> 1-2 business days</li>
                  </ul>
                  <p>To expedite the process, have all required documents ready upfront and respond promptly to any requests from your loan officer.</p>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(1) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(1)}>
                  <h4>What documents do I need to apply for a mortgage?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>To complete your mortgage application, you'll need to provide the following documentation:</p>
                  <div className="document-checklist">
                    <div className="checklist-category">
                      <h5>📋 Income Verification</h5>
                      <ul>
                        <li>Last 2 years of W-2 forms</li>
                        <li>Most recent 2 pay stubs (showing year-to-date earnings)</li>
                        <li>2 years of tax returns (if self-employed)</li>
                        <li>Profit & Loss statements (for business owners)</li>
                      </ul>
                    </div>
                    <div className="checklist-category">
                      <h5>💰 Asset Documentation</h5>
                      <ul>
                        <li>Last 2 months of bank statements (all accounts)</li>
                        <li>Investment account statements</li>
                        <li>Retirement account statements (401k, IRA)</li>
                        <li>Gift letter (if using gift funds for down payment)</li>
                      </ul>
                    </div>
                    <div className="checklist-category">
                      <h5>🆔 Personal Information</h5>
                      <ul>
                        <li>Valid government-issued photo ID</li>
                        <li>Social Security card or proof of SSN</li>
                        <li>Proof of residence (utility bills, lease agreement)</li>
                      </ul>
                    </div>
                    <div className="checklist-category">
                      <h5>🏠 Property Information</h5>
                      <ul>
                        <li>Purchase agreement or sales contract</li>
                        <li>Homeowners insurance information</li>
                        <li>HOA documents (if applicable)</li>
                      </ul>
                    </div>
                  </div>
                  <p className="faq-tip"><strong>💡 Pro Tip:</strong> Upload documents digitally through our secure portal to speed up processing!</p>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(2) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(2)}>
                  <h4>What's the difference between prequalification and preapproval?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>While both are important steps in the home buying process, they serve different purposes:</p>
                  <div className="comparison-table">
                    <div className="comparison-column">
                      <div className="comparison-header prequalification">
                        <h5>Prequalification</h5>
                        <span className="comparison-badge">Quick Estimate</span>
                      </div>
                      <ul>
                        <li><strong>Time:</strong> 5-10 minutes</li>
                        <li><strong>Credit check:</strong> No hard inquiry</li>
                        <li><strong>Documentation:</strong> Self-reported information</li>
                        <li><strong>Verification:</strong> Not verified by lender</li>
                        <li><strong>Validity:</strong> Informal estimate</li>
                        <li><strong>Best for:</strong> Initial budget planning</li>
                      </ul>
                    </div>
                    <div className="comparison-column">
                      <div className="comparison-header preapproval">
                        <h5>Preapproval</h5>
                        <span className="comparison-badge">Official Commitment</span>
                      </div>
                      <ul>
                        <li><strong>Time:</strong> 1-3 business days</li>
                        <li><strong>Credit check:</strong> Hard credit inquiry</li>
                        <li><strong>Documentation:</strong> Full documentation required</li>
                        <li><strong>Verification:</strong> Verified by underwriter</li>
                        <li><strong>Validity:</strong> Official letter (60-90 days)</li>
                        <li><strong>Best for:</strong> Serious home shopping</li>
                      </ul>
                    </div>
                  </div>
                  <p><strong>🎯 Our Recommendation:</strong> Get preapproved before house hunting. Sellers take preapproved buyers more seriously, and you'll have a clear budget and stronger negotiating position.</p>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(3) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(3)}>
                  <h4>Can I get a mortgage with bad credit?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>Yes! While higher credit scores typically result in better rates, there are mortgage options available for various credit situations:</p>
                  <div className="credit-score-guide">
                    <div className="score-range excellent">
                      <div className="score-label">740+</div>
                      <div className="score-info">
                        <strong>Excellent</strong>
                        <p>Best rates on all loan types</p>
                      </div>
                    </div>
                    <div className="score-range good">
                      <div className="score-label">670-739</div>
                      <div className="score-info">
                        <strong>Good</strong>
                        <p>Competitive rates, most loan types available</p>
                      </div>
                    </div>
                    <div className="score-range fair">
                      <div className="score-label">580-669</div>
                      <div className="score-info">
                        <strong>Fair</strong>
                        <p>FHA loans available (minimum 580), higher rates</p>
                      </div>
                    </div>
                    <div className="score-range poor">
                      <div className="score-label">500-579</div>
                      <div className="score-info">
                        <strong>Poor</strong>
                        <p>FHA with 10% down, limited options</p>
                      </div>
                    </div>
                  </div>
                  <p><strong>💪 Credit Improvement Tips:</strong></p>
                  <ul>
                    <li>Pay all bills on time for at least 6 months</li>
                    <li>Reduce credit card balances below 30% of limits</li>
                    <li>Don't close old credit accounts</li>
                    <li>Dispute any errors on your credit report</li>
                    <li>Consider a credit counselor for personalized guidance</li>
                  </ul>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(4) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(4)}>
                  <h4>How are mortgage interest rates determined?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>Mortgage rates are influenced by both market conditions and your personal financial profile:</p>
                  <div className="rate-factors">
                    <div className="factor-card">
                      <h5>🏦 Market Factors</h5>
                      <ul>
                        <li>Federal Reserve policy</li>
                        <li>Inflation rates</li>
                        <li>Economic indicators</li>
                        <li>Bond market trends</li>
                      </ul>
                    </div>
                    <div className="factor-card">
                      <h5>👤 Personal Factors</h5>
                      <ul>
                        <li>Credit score (biggest impact)</li>
                        <li>Down payment amount</li>
                        <li>Loan-to-value ratio</li>
                        <li>Debt-to-income ratio</li>
                        <li>Loan type and term</li>
                        <li>Property type and location</li>
                      </ul>
                    </div>
                  </div>
                  <p><strong>🔒 Lock Your Rate:</strong> Once approved, you can lock your rate for 30-60 days to protect against increases during the closing process.</p>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(5) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(5)}>
                  <h4>Should I pay points to lower my interest rate?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>Mortgage points (also called discount points) allow you to "buy down" your interest rate. Each point costs 1% of your loan amount and typically reduces your rate by 0.25%.</p>
                  <div className="points-example">
                    <h5>💡 Example: $400,000 Loan</h5>
                    <div className="points-comparison">
                      <div className="points-option">
                        <strong>No Points</strong>
                        <p>Rate: 7.0%</p>
                        <p>Monthly: $2,661</p>
                        <p>Upfront cost: $0</p>
                      </div>
                      <div className="points-option">
                        <strong>1 Point</strong>
                        <p>Rate: 6.75%</p>
                        <p>Monthly: $2,594</p>
                        <p>Upfront cost: $4,000</p>
                        <p className="break-even">Break-even: 60 months</p>
                      </div>
                      <div className="points-option">
                        <strong>2 Points</strong>
                        <p>Rate: 6.5%</p>
                        <p>Monthly: $2,528</p>
                        <p>Upfront cost: $8,000</p>
                        <p className="break-even">Break-even: 60 months</p>
                      </div>
                    </div>
                  </div>
                  <p><strong>✅ Points Make Sense If:</strong></p>
                  <ul>
                    <li>You plan to stay in the home long-term (past break-even)</li>
                    <li>You have extra cash for upfront costs</li>
                    <li>You want to lower monthly payments</li>
                  </ul>
                  <p><strong>❌ Skip Points If:</strong></p>
                  <ul>
                    <li>You might sell or refinance soon</li>
                    <li>You need cash reserves for other expenses</li>
                    <li>You'd rather use funds for a larger down payment</li>
                  </ul>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(6) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(6)}>
                  <h4>What's included in my monthly mortgage payment?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>Your total monthly payment consists of several components, commonly referred to as <strong>PITI</strong>:</p>
                  <div className="piti-breakdown">
                    <div className="piti-item">
                      <div className="piti-letter">P</div>
                      <div className="piti-info">
                        <strong>Principal</strong>
                        <p>The amount that goes toward paying down your loan balance</p>
                      </div>
                    </div>
                    <div className="piti-item">
                      <div className="piti-letter">I</div>
                      <div className="piti-info">
                        <strong>Interest</strong>
                        <p>The cost of borrowing money, calculated as a percentage of the remaining balance</p>
                      </div>
                    </div>
                    <div className="piti-item">
                      <div className="piti-letter">T</div>
                      <div className="piti-info">
                        <strong>Taxes</strong>
                        <p>Property taxes collected monthly and held in escrow, then paid annually to local government</p>
                      </div>
                    </div>
                    <div className="piti-item">
                      <div className="piti-letter">I</div>
                      <div className="piti-info">
                        <strong>Insurance</strong>
                        <p>Homeowners insurance (required) and PMI if down payment is less than 20%</p>
                      </div>
                    </div>
                  </div>
                  <p><strong>Additional Costs:</strong> Some payments may also include HOA fees, which are paid separately or included in escrow.</p>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(7) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(7)}>
                  <h4>What's the difference between a 15-year and 30-year mortgage?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>The loan term significantly impacts your monthly payment and total interest paid:</p>
                  <div className="loan-term-comparison">
                    <div className="term-column">
                      <h5>30-Year Fixed</h5>
                      <div className="pros-cons">
                        <div className="pros">
                          <strong>✅ Advantages</strong>
                          <ul>
                            <li>Lower monthly payments</li>
                            <li>More affordable for most buyers</li>
                            <li>Greater flexibility in budget</li>
                            <li>Can invest difference elsewhere</li>
                          </ul>
                        </div>
                        <div className="cons">
                          <strong>❌ Disadvantages</strong>
                          <ul>
                            <li>Higher interest rate</li>
                            <li>Pay significantly more interest over life of loan</li>
                            <li>Slower equity building</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="term-column">
                      <h5>15-Year Fixed</h5>
                      <div className="pros-cons">
                        <div className="pros">
                          <strong>✅ Advantages</strong>
                          <ul>
                            <li>Lower interest rate</li>
                            <li>Save tens of thousands in interest</li>
                            <li>Build equity faster</li>
                            <li>Own home free and clear sooner</li>
                          </ul>
                        </div>
                        <div className="cons">
                          <strong>❌ Disadvantages</strong>
                          <ul>
                            <li>Higher monthly payments</li>
                            <li>Less monthly budget flexibility</li>
                            <li>May not qualify for as much</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p><strong>💡 Middle Ground:</strong> Consider a 30-year mortgage with extra principal payments. You get the flexibility of lower required payments but can pay it off faster when able.</p>
                </div>
              </div>

              <div className={`faq-item ${openFaqItems.has(8) ? 'active' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaqItem(8)}>
                  <h4>When should I consider an ARM vs. a fixed-rate mortgage?</h4>
                  <svg className="faq-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                <div className="faq-answer">
                  <p>Adjustable-Rate Mortgages (ARMs) can offer lower initial rates but come with uncertainty. Here's when each makes sense:</p>
                  <div className="arm-vs-fixed">
                    <div className="mortgage-type-card">
                      <h5>🔒 Choose Fixed-Rate If You:</h5>
                      <ul>
                        <li>Plan to stay in the home long-term (7+ years)</li>
                        <li>Want predictable payments</li>
                        <li>Believe rates will rise</li>
                        <li>Prefer stability over potential savings</li>
                        <li>Are on a fixed income</li>
                      </ul>
                    </div>
                    <div className="mortgage-type-card">
                      <h5>📊 Consider ARM If You:</h5>
                      <ul>
                        <li>Plan to sell or refinance within 5-7 years</li>
                        <li>Expect income to increase significantly</li>
                        <li>Can handle payment fluctuations</li>
                        <li>Want lower initial payments</li>
                        <li>Believe rates will decrease</li>
                      </ul>
                    </div>
                  </div>
                  <p><strong>Popular ARM Types:</strong> 5/1 ARM (fixed for 5 years), 7/1 ARM (fixed for 7 years), 10/1 ARM (fixed for 10 years)</p>
                </div>
              </div>
          </div>
        </div>
        ) : null}
      </div>
    </div>
  )
}

export default App
