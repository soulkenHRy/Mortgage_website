const { chatWithGemini } = require('../services/aiService');

exports.chatWithAI = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
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
