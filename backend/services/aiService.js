const { GoogleGenerativeAI } = require('@google/generative-ai');

const chatWithGemini = async (message, conversationHistory) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Chatbot service not configured');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const recentHistory = conversationHistory 
    ? conversationHistory.slice(-5).map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n')
    : '';

  const conversationContext = `You are a helpful mortgage and real estate assistant. 
You should provide accurate, friendly, and professional advice about mortgages, home buying, 
interest rates, qualification requirements, and related financial topics. 

Formatting guidelines:
- Use clear paragraphs separated by blank lines
- Use bullet points (•) for lists
- Use numbered lists (1., 2., 3.) for steps
- Keep responses well-organized and easy to read
- Use simple formatting without markdown symbols

${recentHistory ? `Previous conversation:\n${recentHistory}\n` : ''}
User: ${message}
Assistant:`;

  const result = await model.generateContent(conversationContext);
  const response = await result.response;
  return response.text();
};

module.exports = { chatWithGemini };
