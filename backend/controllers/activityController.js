const UserActivity = require('../models/UserActivity');

// Save calculator usage
exports.saveCalculatorActivity = async (req, res) => {
  try {
    const { username, email, calculationData } = req.body;

    if (!username || !email || !calculationData) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and calculation data are required'
      });
    }

    const activity = new UserActivity({
      username,
      email,
      activityType: 'calculator',
      data: calculationData
    });

    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Calculator activity saved successfully',
      activityId: activity._id
    });
  } catch (error) {
    console.error('Error saving calculator activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save calculator activity'
    });
  }
};

// Save chatbot interaction
exports.saveChatbotActivity = async (req, res) => {
  try {
    const { username, email, chatData } = req.body;

    if (!username || !email || !chatData) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and chat data are required'
      });
    }

    const activity = new UserActivity({
      username,
      email,
      activityType: 'chatbot',
      data: chatData
    });

    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Chatbot activity saved successfully',
      activityId: activity._id
    });
  } catch (error) {
    console.error('Error saving chatbot activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save chatbot activity'
    });
  }
};

// Save pre-qualification submission
exports.savePrequalificationActivity = async (req, res) => {
  try {
    const { username, email, prequalificationData } = req.body;

    if (!username || !email || !prequalificationData) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and pre-qualification data are required'
      });
    }

    const activity = new UserActivity({
      username,
      email,
      activityType: 'prequalification',
      data: prequalificationData
    });

    await activity.save();

    res.status(201).json({
      success: true,
      message: 'Pre-qualification activity saved successfully',
      activityId: activity._id
    });
  } catch (error) {
    console.error('Error saving pre-qualification activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save pre-qualification activity'
    });
  }
};

// Get user activities (optional - for viewing activity history)
exports.getUserActivities = async (req, res) => {
  try {
    const { username } = req.params;
    const { activityType, limit = 50, skip = 0 } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    const query = { username };
    
    if (activityType) {
      query.activityType = activityType;
    }

    const activities = await UserActivity.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const totalCount = await UserActivity.countDocuments(query);

    res.status(200).json({
      success: true,
      activities,
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activities'
    });
  }
};

// Get activity statistics for a user
exports.getUserActivityStats = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    const stats = await UserActivity.aggregate([
      { $match: { username } },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      }
    ]);

    const totalActivities = await UserActivity.countDocuments({ username });

    res.status(200).json({
      success: true,
      stats,
      totalActivities
    });
  } catch (error) {
    console.error('Error fetching user activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity statistics'
    });
  }
};
