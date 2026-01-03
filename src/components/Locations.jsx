import { useState, useEffect } from 'react';
import './Locations.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Locations() {
  const [locations, setLocations] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [selectedPropertyType, setSelectedPropertyType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const propertyTypeOptions = [
    { 
      key: 'houses', 
      label: 'Houses', 
      description: 'Single-family homes',
      icon: '🏠'
    },
    { 
      key: 'condos', 
      label: 'Condos', 
      description: 'Condominium apartments',
      icon: '🏢'
    },
    { 
      key: 'townhouses', 
      label: 'Townhouses',
      description: 'Multi-level townhouse properties',
      icon: '🏘️'
    },
    { 
      key: 'multiFamily', 
      label: 'Multi-Family Properties', 
      description: 'Duplexes, triplexes, apartment buildings',
      icon: '🏬'
    },
    { 
      key: 'land', 
      label: 'Land', 
      description: 'Vacant lots you plan to build on',
      icon: '🌳'
    },
    { 
      key: 'commercial', 
      label: 'Commercial Real Estate', 
      description: 'Office buildings, retail spaces, warehouses',
      icon: '🏭'
    }
  ];

  // Fetch all locations on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/locations`);
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
      } else {
        setError('Failed to load locations');
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleCityClick = async (cityName) => {
    if (selectedCity === cityName) {
      setSelectedCity(null);
      setLocationData(null);
      setSelectedPropertyType(null);
      return;
    }

    setSelectedCity(cityName);
    setSelectedPropertyType(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/locations/${encodeURIComponent(cityName)}`);
      const data = await response.json();
      
      if (data.success) {
        setLocationData(data.location);
        console.log('Location data loaded:', {
          name: data.location.locationName,
          hasMortgageInfo: !!data.location.mortgageInfo,
          trustedResourcesCount: data.location.mortgageInfo?.trustedResources?.length || 0
        });
      } else {
        setError('Failed to load location details');
      }
    } catch (err) {
      console.error('Error fetching location data:', err);
      setError('Unable to load location details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="locations-container">
      <div className="locations-header">
        <h1>Ontario Cities</h1>
        <p className="locations-subtitle">
          Select a city to view more information
        </p>
      </div>

      <div className="locations-content">
        {/* City List */}
        <div className="city-list-container">
          <h2>Ontario Cities</h2>
          {loading && !locationData ? (
            <div className="loading-spinner">Loading...</div>
          ) : error && !locations.length ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="city-list">
              {locations.map((location) => (
                <button
                  key={location._id}
                  className={`city-item ${selectedCity === location.locationName ? 'selected' : ''}`}
                  onClick={() => handleCityClick(location.locationName)}
                >
                  <div className="city-name">{location.locationName}</div>
                  <div className="city-price">
                    {formatCurrency(location.averageHomePrice.average)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* City Details */}
        {selectedCity && locationData && (
          <div className="city-details">
            <div className="detail-header">
              <h2>{locationData.locationName}</h2>
              <span className="region-badge">{locationData.region}</span>
            </div>

            {/* Home Prices Section */}
            <div className="detail-section">
              <h3>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Average Home Prices
              </h3>
              <div className="price-grid">
                <div className="price-item">
                  <span className="price-label">Median Price</span>
                  <span className="price-value">{formatCurrency(locationData.averageHomePrice.median)}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Average Price</span>
                  <span className="price-value">{formatCurrency(locationData.averageHomePrice.average)}</span>
                </div>
                <div className="price-item">
                  <span className="price-label">Price Range</span>
                  <span className="price-value">
                    {formatCurrency(locationData.averageHomePrice.priceRange.low)} - {formatCurrency(locationData.averageHomePrice.priceRange.high)}
                  </span>
                </div>
              </div>
            </div>

            {/* Property Types Section */}
            {locationData.propertyTypes && Object.keys(locationData.propertyTypes).length > 0 && (
              <div className="detail-section">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  Property Types
                </h3>
                <p className="section-description">Select a property type to view detailed information</p>
                <div className="property-types-grid">
                  {propertyTypeOptions.map((option) => {
                    const hasData = locationData.propertyTypes[option.key];
                    return (
                      <button
                        key={option.key}
                        className={`property-type-card ${selectedPropertyType === option.key ? 'selected' : ''} ${!hasData ? 'disabled' : ''}`}
                        onClick={() => hasData && setSelectedPropertyType(selectedPropertyType === option.key ? null : option.key)}
                        disabled={!hasData}
                      >
                        <span className="property-icon">{option.icon}</span>
                        <h4>{option.label}</h4>
                        <p>{option.description}</p>
                        {!hasData && <span className="no-data-badge">No data available</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Property Type Details */}
                {selectedPropertyType && locationData.propertyTypes[selectedPropertyType] && (
                  <div className="property-type-details">
                    <h4>{propertyTypeOptions.find(o => o.key === selectedPropertyType)?.label} in {locationData.locationName}</h4>
                    <div className="property-details-grid">
                      {locationData.propertyTypes[selectedPropertyType].averagePrice && (
                        <div className="detail-item">
                          <span className="detail-label">Average Price</span>
                          <span className="detail-value">{formatCurrency(locationData.propertyTypes[selectedPropertyType].averagePrice)}</span>
                        </div>
                      )}
                      {locationData.propertyTypes[selectedPropertyType].medianPrice && (
                        <div className="detail-item">
                          <span className="detail-label">Median Price</span>
                          <span className="detail-value">{formatCurrency(locationData.propertyTypes[selectedPropertyType].medianPrice)}</span>
                        </div>
                      )}
                      {locationData.propertyTypes[selectedPropertyType].priceRange && (
                        <div className="detail-item">
                          <span className="detail-label">Price Range</span>
                          <span className="detail-value">
                            {formatCurrency(locationData.propertyTypes[selectedPropertyType].priceRange.low)} - {formatCurrency(locationData.propertyTypes[selectedPropertyType].priceRange.high)}
                          </span>
                        </div>
                      )}
                      {locationData.propertyTypes[selectedPropertyType].averageDaysOnMarket && (
                        <div className="detail-item">
                          <span className="detail-label">Avg. Days on Market</span>
                          <span className="detail-value">{locationData.propertyTypes[selectedPropertyType].averageDaysOnMarket} days</span>
                        </div>
                      )}
                      {locationData.propertyTypes[selectedPropertyType].pricePerSqFt && (
                        <div className="detail-item">
                          <span className="detail-label">Price per Sq Ft</span>
                          <span className="detail-value">{formatCurrency(locationData.propertyTypes[selectedPropertyType].pricePerSqFt)}</span>
                        </div>
                      )}
                      {locationData.propertyTypes[selectedPropertyType].inventoryCount && (
                        <div className="detail-item">
                          <span className="detail-label">Available Listings</span>
                          <span className="detail-value">{locationData.propertyTypes[selectedPropertyType].inventoryCount}</span>
                        </div>
                      )}
                    </div>
                    {locationData.propertyTypes[selectedPropertyType].lastUpdated && (
                      <p className="data-updated">
                        Last updated: {new Date(locationData.propertyTypes[selectedPropertyType].lastUpdated).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Property Tax Section */}
            {locationData.propertyTaxRate && locationData.propertyTaxRate.rate && (
              <div className="detail-section">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                    <line x1="1" y1="10" x2="23" y2="10"/>
                  </svg>
                  Property Tax Rates
                </h3>
                <div className="tax-info">
                  <div className="tax-rate">
                    <span className="tax-label">Tax Rate</span>
                    <span className="tax-value">{locationData.propertyTaxRate.rate}%</span>
                  </div>
                  <div className="tax-example">
                    <p className="tax-description">{locationData.propertyTaxRate.description}</p>
                    <p className="tax-calc">
                      For a home priced at {formatCurrency(locationData.propertyTaxRate.annualTaxExample.homePrice)}, 
                      annual property tax: <strong>{formatCurrency(locationData.propertyTaxRate.annualTaxExample.taxAmount)}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information Section - Only show if we have real data */}
            {locationData.additionalInfo && (
              <div className="detail-section additional-info">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  Market Insights
                </h3>
                <div className="insights-grid">
                  {locationData.additionalInfo.averageDaysOnMarket && (
                    <div className="insight-item">
                      <span className="insight-label">Avg. Days on Market</span>
                      <span className="insight-value">{locationData.additionalInfo.averageDaysOnMarket} days</span>
                    </div>
                  )}
                </div>

                {locationData.additionalInfo.demographics && (locationData.additionalInfo.demographics.averageHouseholdIncome || locationData.additionalInfo.demographics.populationGrowth) && (
                  <div className="demographics">
                    <h4>Demographics</h4>
                    <div className="demo-grid">
                      {locationData.additionalInfo.demographics.averageHouseholdIncome && (
                        <div className="demo-item">
                          <span className="demo-label">Avg. Household Income</span>
                          <span className="demo-value">
                            {formatCurrency(locationData.additionalInfo.demographics.averageHouseholdIncome)}
                          </span>
                        </div>
                      )}
                      {locationData.additionalInfo.demographics.populationGrowth && (
                        <div className="demo-item">
                          <span className="demo-label">Population Growth</span>
                          <span className="demo-value">{locationData.additionalInfo.demographics.populationGrowth}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mortgage Information Section */}
            {locationData.mortgageInfo && (
              <div className="detail-section mortgage-info-section">
                <h3>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  Mortgage Guide for {locationData.locationName}
                </h3>
                
                {locationData.mortgageInfo.description && (
                  <p className="mortgage-description">{locationData.mortgageInfo.description}</p>
                )}

                {locationData.mortgageInfo.marketInsights && locationData.mortgageInfo.marketInsights.length > 0 && (
                  <div className="mortgage-subsection">
                    <h4>Market Insights</h4>
                    <ul className="insights-list">
                      {locationData.mortgageInfo.marketInsights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {locationData.mortgageInfo.buyerTips && locationData.mortgageInfo.buyerTips.length > 0 && (
                  <div className="mortgage-subsection">
                    <h4>💡 Homebuyer Tips</h4>
                    <ul className="tips-list">
                      {locationData.mortgageInfo.buyerTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {locationData.mortgageInfo.trustedResources && locationData.mortgageInfo.trustedResources.length > 0 && (
                  <div className="mortgage-subsection">
                    <h4>🔗 Trusted Resources</h4>
                    <div className="resources-grid">
                      {locationData.mortgageInfo.trustedResources.map((resource, index) => (
                        <a 
                          key={index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="resource-card"
                        >
                          <div className="resource-header">
                            <span className="resource-name">{resource.name}</span>
                            <span className="resource-category">{resource.category}</span>
                          </div>
                          <p className="resource-description">{resource.description}</p>
                          <span className="resource-link">Visit Website →</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedCity && loading && (
          <div className="city-details">
            <div className="loading-spinner">Loading location details...</div>
          </div>
        )}

        {!selectedCity && (
          <div className="no-selection">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <h3>Select a City</h3>
            <p>Choose an Ontario city to view more information</p>
            
            <div className="locations-map">
              <img 
                src="/Greater_Toronto_Area_map.png" 
                alt="Greater Toronto Area Map" 
                className="gta-map-image"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Locations;
