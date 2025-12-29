import React, { useState, useEffect } from 'react';
import './MortgageRatesTable.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';


const MortgageRatesTable = () => {
  const [ratesData, setRatesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [scrapedSuccessfully, setScrapedSuccessfully] = useState(true);
  const tableWrapperRef = React.useRef(null);

  useEffect(() => {
    fetchMortgageRates();
  }, []);

  // Prevent horizontal scroll from propagating to the page
  useEffect(() => {
    const tableWrapper = tableWrapperRef.current;
    if (!tableWrapper) return;

    const handleWheel = (e) => {
      const { scrollLeft, scrollWidth, clientWidth } = tableWrapper;
      const isScrollingRight = e.deltaX > 0;
      const isScrollingLeft = e.deltaX < 0;
      const atRightEdge = scrollLeft + clientWidth >= scrollWidth - 1;
      const atLeftEdge = scrollLeft === 0;

      // Prevent page scroll when trying to scroll beyond table boundaries
      if ((atRightEdge && isScrollingRight) || (atLeftEdge && isScrollingLeft)) {
        e.preventDefault();
        return;
      }

      // If there's horizontal scroll happening, stop it from reaching the page
      if (Math.abs(e.deltaX) > 0) {
        e.stopPropagation();
      }
    };

    const handleTouchStart = (e) => {
      tableWrapper.touchStartX = e.touches[0].clientX;
      tableWrapper.scrollLeftStart = tableWrapper.scrollLeft;
    };

    const handleTouchMove = (e) => {
      if (!tableWrapper.touchStartX) return;

      const touchDeltaX = tableWrapper.touchStartX - e.touches[0].clientX;
      const { scrollLeft, scrollWidth, clientWidth } = tableWrapper;
      const atRightEdge = scrollLeft + clientWidth >= scrollWidth - 1;
      const atLeftEdge = scrollLeft === 0;

      // Prevent page scroll if we're scrolling within bounds
      if ((touchDeltaX > 0 && !atRightEdge) || (touchDeltaX < 0 && !atLeftEdge)) {
        e.stopPropagation();
      }
    };

    // Auto-scroll table to left when user scrolls to top of page
    const handleScroll = () => {
      if (window.scrollY === 0 && tableWrapper.scrollLeft !== 0) {
        tableWrapper.scrollTo({ left: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('scroll', handleScroll);
    tableWrapper.addEventListener('wheel', handleWheel, { passive: false });
    tableWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    tableWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      tableWrapper.removeEventListener('wheel', handleWheel);
      tableWrapper.removeEventListener('touchstart', handleTouchStart);
      tableWrapper.removeEventListener('touchmove', handleTouchMove);
    };
  }, [ratesData]);

  const fetchMortgageRates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/mortgage-rates`);
      const data = await response.json();

      if (data.success) {
        setRatesData(data.rates);
        setLastUpdated(data.lastUpdated);
        setScrapedSuccessfully(data.rates?.scrapedSuccessfully !== false);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch rates');
      }
    } catch (err) {
      setError('Unable to connect to server. Please ensure the backend is running.');
      console.error('Error fetching mortgage rates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/mortgage-rates/refresh`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        await fetchMortgageRates();
      }
    } catch (err) {
      console.error('Error refreshing rates:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return `$${value.toFixed(2)}`;
  };

  const formatRate = (value) => {
    if (!value) return 'N/A';
    if (!scrapedSuccessfully) return 'Connecting...';
    return `${value.toFixed(2)}%`;
  };

  // Calculate monthly payment per $100K based on rate and term
  const calculatePayment = (annualRate, termYears) => {
    if (!annualRate || !termYears) return null;

    const principal = 100000;
    const monthlyRate = annualRate / 12 / 100; // Convert annual % to monthly decimal
    const numPayments = termYears * 12;

    if (monthlyRate === 0) return principal / numPayments;

    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                    (Math.pow(1 + monthlyRate, numPayments) - 1);

    return payment;
  };

  // Calculate payment breakdown (average principal, average interest, total payment per month)
  const calculatePaymentBreakdown = (annualRate, termYears) => {
    if (!annualRate || !termYears) return { principal: null, interest: null, total: null };

    const principal = 100000;
    const numPayments = termYears * 12;
    const monthlyPayment = calculatePayment(annualRate, termYears);

    if (!monthlyPayment) return { principal: null, interest: null, total: null };

    // Average principal per month = total principal / number of months
    const avgPrincipal = principal / numPayments;

    // Total interest paid over term = (monthly payment × number of months) - principal
    const totalInterest = (monthlyPayment * numPayments) - principal;

    // Average interest per month = total interest / number of months
    const avgInterest = totalInterest / numPayments;

    return {
      principal: avgPrincipal,
      interest: avgInterest,
      total: monthlyPayment
    };
  };

  // Calculate our rate (1% less than bank rate)
  const calculateOurRate = (bankRate) => {
    if (!bankRate) return null;
    return bankRate - 1;
  };

  // Calculate savings (difference between bank total payment and our total payment)
  const calculateSavings = (bankRate, ourRate, termYears) => {
    if (!bankRate || !ourRate || !termYears) return null;

    const bankPayment = calculatePaymentBreakdown(bankRate, termYears).total;
    const ourPayment = calculatePaymentBreakdown(ourRate, termYears).total;

    if (!bankPayment || !ourPayment) return null;

    return bankPayment - ourPayment;
  };

  if (loading && !ratesData) {
    return (
      <div className="mortgage-rates-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading mortgage rates...</p>
        </div>
      </div>
    );
  }

  if (error && !ratesData) {
    return (
      <div className="mortgage-rates-container">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchMortgageRates} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mortgage-rates-container">
      <div className="rates-header">
        <div className="header-content">
          <h1 className="rates-title">Canadian Mortgage Rates</h1>
          <p className="rates-subtitle">Fixed-Rate Mortgage Interest Rates by Term</p>
          {!scrapedSuccessfully && (
            <div className="connecting-status">
              <span className="connecting-indicator">●</span>
              <span className="connecting-text">Connecting to live data source...</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="refresh-button"
            title="Refresh rates"
          >
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {formatDate(lastUpdated)}
            </span>
          )}
        </div>
      </div>

      {/* Key Rates Summary */}
      <div className="key-rates-summary">
        <div className="key-rate-card">
          <div className="key-rate-label">Bank of Canada Rate</div>
          <div className="key-rate-value bank-rate">
            {formatRate(ratesData?.bankRate)}
          </div>
        </div>
        <div className="key-rate-card">
          <div className="key-rate-label">Current Prime Rate</div>
          <div className="key-rate-value prime-rate">
            {formatRate(ratesData?.currentPrimeRate)}
          </div>
        </div>
        <div className="key-rate-card">
          <div className="key-rate-label">Current Variable Rate</div>
          <div className="key-rate-value variable-rate">
            {formatRate(ratesData?.currentVariableRate)}
          </div>
        </div>
        <div className="key-rate-card">
          <div className="key-rate-label">5-Year Fixed (Insured)</div>
          <div className="key-rate-value insured-rate">
            {formatRate(ratesData?.insuredRates?.fiveYearFixed)}
          </div>
        </div>
        <div className="key-rate-card">
          <div className="key-rate-label">5-Year Fixed (Uninsured)</div>
          <div className="key-rate-value uninsured-rate">
            {formatRate(ratesData?.uninsuredRates?.fiveYearFixed)}
          </div>
        </div>
      </div>

      {/* Main Rates Table - only this scrolls horizontally */}
      <div className="rates-table-flex-container">
        <div className="rates-table-wrapper" ref={tableWrapperRef}>
          <table className="rates-table">
          <thead>
            <tr>
              <th className="row-header" style={{ background: '#000000', backgroundColor: '#000000', color: '#ffffff', border: '2px solid #ffffff' }}>Rate Type</th>
              <th className="bank-rates-subheader">Bank Rate (per $100k CAD)</th>
              <th className="bank-rates-subheader">Avg Principal/mo</th>
              <th className="bank-rates-subheader">Avg Interest/mo</th>
              <th className="bank-rates-subheader">Total Payment/mo</th>
            </tr>
          </thead>
          <tbody>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>1 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.oneYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.oneYear, 1).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.oneYear, 1).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.oneYear, 1).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>2 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.twoYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.twoYear, 2).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.twoYear, 2).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.twoYear, 2).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>3 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.threeYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.threeYear, 3).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.threeYear, 3).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.threeYear, 3).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>4 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.fourYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.fourYear, 4).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.fourYear, 4).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.fourYear, 4).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>5 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.fiveYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.fiveYear, 5).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.fiveYear, 5).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.fiveYear, 5).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>6 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.sixYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.sixYear, 6).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.sixYear, 6).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.sixYear, 6).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>7 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.sevenYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.sevenYear, 7).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.sevenYear, 7).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.sevenYear, 7).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>8 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.eightYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.eightYear, 8).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.eightYear, 8).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.eightYear, 8).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>9 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.nineYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.nineYear, 9).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.nineYear, 9).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.nineYear, 9).total)}</td>
            </tr>
            <tr className="rate-row">
              <td className="row-header" style={{ backgroundColor: '#000000', color: '#ffffff' }}>10 Year Fixed</td>
              <td data-label="Bank Rate">{formatRate(ratesData?.fixedRates?.tenYear)}</td>
              <td data-label="Bank Principal">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.tenYear, 10).principal)}</td>
              <td data-label="Bank Interest">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.tenYear, 10).interest)}</td>
              <td data-label="Bank Total">{formatCurrency(calculatePaymentBreakdown(ratesData?.fixedRates?.tenYear, 10).total)}</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* Additional Information */}
      <div className="rates-info">
        <div className="info-card">
          <h3>About These Rates</h3>
          <ul>
            <li>Rates are sourced from RateHub.ca and updated daily at 9 AM EST</li>
            <li>Payment amounts are calculated based on monthly payments with the principal amortized over the term</li>
            <li>Actual rates may vary by lender, credit score, and property type</li>
            <li>Insured mortgages (with CMHC insurance) typically receive better rates</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>Understanding the Table</h3>
          <ul>
            <li><strong>Bank Rate:</strong> The annual interest rate for fixed-term mortgages</li>
            <li><strong>Avg Principal/mo:</strong> The average amount per month that goes toward paying off your loan principal (the amount you borrowed). This is calculated by dividing $100,000 by the total number of months in the term</li>
            <li><strong>Avg Interest/mo:</strong> The average amount per month that goes toward interest charges. This is your cost for borrowing the money</li>
            <li><strong>Total Payment/mo:</strong> Your complete <strong>monthly payment</strong> per $100,000 borrowed (Principal + Interest). For example, if you borrow $300,000, multiply this amount by 3 to get your actual monthly payment</li>
            <li><strong>Why Averages?</strong> In reality, your early payments have more interest and less principal. Later payments have more principal and less interest. We show averages to make it easier to compare different terms and rates</li>
            <li><strong>Prime Rate:</strong> Base rate used by banks for variable mortgages</li>
            <li><strong>Variable Rate:</strong> Current rate for variable-rate mortgages (prime + discount/premium)</li>
          </ul>
        </div>
      </div>

      <div className="data-source">
        <p>Data Source: {ratesData?.source || 'RateHub.ca'} | Next automatic update: Tomorrow at 9:00 AM EST</p>
      </div>
    </div>
  );
};

export default MortgageRatesTable;