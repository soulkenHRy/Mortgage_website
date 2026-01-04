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
    console.error('Gemini API error:', error);
    
    let errorMessage = 'Sorry, I encountered an error. Please try again.';
    if (error.message?.includes('not configured')) {
      errorMessage = 'Chatbot service not configured';
    } else if (error.message?.includes('API_KEY')) {
      errorMessage = 'API key issue. Please contact support.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later.';
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};
