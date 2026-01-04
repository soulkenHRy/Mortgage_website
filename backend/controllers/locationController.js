const LocationData = require('../models/LocationData');
const { scrapeAndSaveAllLocations } = require('../scrapers/locationDataScraper');

exports.getAllLocations = async (req, res) => {
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
};

exports.getLocationByName = async (req, res) => {
  try {
    const { locationName } = req.params;
    
    const sanitizedName = locationName.replace(/[^a-zA-Z0-9\s-]/g, '');
    
    console.log(`📍 Fetching location details for: ${sanitizedName}`);

    const location = await LocationData.findOne({ 
      locationName: { $regex: new RegExp(`^${sanitizedName}$`, 'i') } 
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
};

exports.refreshLocations = async (req, res) => {
  try {
    const forceRefresh = req.body?.force === true || req.query?.force === 'true';
    
    console.log(`🔄 Location data refresh ${forceRefresh ? '(FORCED)' : '(checking if needed)'}...`);
    
    const sampleLocation = await LocationData.findOne({ region: 'GTA Toronto' })
      .sort({ 'dataSource.lastUpdated': -1 });
    
    if (!sampleLocation) {
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

    if (forceRefresh || daysSinceUpdate >= 7) {
      console.log(`📊 Refreshing location data (${Math.floor(daysSinceUpdate)} days old)...`);
      
      const deleteResult = await LocationData.deleteMany({ region: 'GTA Toronto' });
      console.log(`🗑️  Cleared ${deleteResult.deletedCount} old location records`);
      
      const result = await scrapeAndSaveAllLocations();
      
      return res.json({
        success: true,
        message: 'Location data refresh completed',
        result: result,
        cleared: deleteResult.deletedCount,
        daysSinceLastUpdate: Math.floor(daysSinceUpdate),
        forced: forceRefresh
      });
    } else {
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
};
