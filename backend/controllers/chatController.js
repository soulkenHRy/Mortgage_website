const { chatWithGemini } = require('../services/aiService');
const UserActivity = require('../models/UserActivity');

exports.chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory, username, email } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }
    
    if (message.length > 5000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message too long (max 5000 characters)' 
      });
    }
    
    const responseText = await chatWithGemini(message, conversationHistory);
    
    // Track chatbot activity if user info provided (non-blocking)
    if (username && email) {
      UserActivity.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        activityType: 'chatbot',
        data: {
          userMessage: message,
          aiResponse: responseText.substring(0, 500), // Store first 500 chars of response
          conversationLength: conversationHistory ? conversationHistory.length : 0
        }
      }).catch(err => console.error('Chat activity tracking error:', err.message));
    }
    
    res.json({
      success: true,
      response: responseText
    });
    
  } catch (error) {
    console.error('Gemini API error:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    res.status(500).json({
      success: false,
      error: `AI Error: ${error.message || 'Unknown error'}`
    });
  }
};
