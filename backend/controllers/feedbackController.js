const Feedback = require('../models/Feedback');

exports.submitFeedback = async (req, res) => {
  try {
    const { username, rating, feedback, date } = req.body;

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

    const newFeedback = new Feedback({
      username,
      rating,
      feedback,
      date: date || new Date(),
      approved: true
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
};

exports.getAllFeedback = async (req, res) => {
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
};

exports.getUserFeedback = async (req, res) => {
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
};
