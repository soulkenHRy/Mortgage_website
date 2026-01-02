import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import './GeminiChatbot.css';

const GeminiChatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI mortgage assistant. I can help you with questions about mortgages, home buying, interest rates, and more. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const genAI = useRef(null);

  useEffect(() => {
    // Initialize Gemini API
    const API_KEY = 'AIzaSyCH6ScEN3PgH8m_JSJ92w3oCDDcT2amP3A';
    genAI.current = new GoogleGenerativeAI(API_KEY);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get Gemini model - using gemini-2.5-flash for free tier
      const model = genAI.current.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Create conversation context with mortgage-specific instructions
      const conversationContext = `You are a helpful mortgage and real estate assistant. 
You should provide accurate, friendly, and professional advice about mortgages, home buying, 
interest rates, qualification requirements, and related financial topics. 
Keep responses clear, concise, and informative. Do not use markdown formatting.

Previous conversation:
${messages.slice(-5).map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n')}

User: ${userMessage}
Assistant:`;

      // Generate response
      const result = await model.generateContent(conversationContext);
      const response = await result.response;
      const text = response.text();

      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error.message?.includes('API_KEY')) {
        errorMessage = 'API key issue. Please contact support.';
      } else if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I\'m your AI mortgage assistant. I can help you with questions about mortgages, home buying, interest rates, and more. How can I assist you today?'
      }
    ]);
  };

  const suggestedQuestions = [
    "What is a fixed-rate mortgage?",
    "How much down payment do I need?",
    "What's the difference between pre-qualification and pre-approval?",
    "How do interest rates affect my monthly payment?",
    "What documents do I need to apply for a mortgage?"
  ];

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="gemini-chatbot-container">
      <div className="chatbot-header">
        <div className="chatbot-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h2>AI Mortgage Assistant</h2>
        </div>
        <button className="clear-chat-btn" onClick={clearChat} title="Clear chat">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/>
            <polyline points="23 20 23 14 17 14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>

      {messages.length === 1 && (
        <div className="suggested-questions">
          <p className="suggested-title">💡 Suggested Questions:</p>
          <div className="suggested-questions-grid">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                className="suggested-question-btn"
                onClick={() => handleSuggestedQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chatbot-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              )}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-container">
        <textarea
          className="chatbot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about mortgages..."
          rows="1"
          disabled={isLoading}
        />
        <button
          className="chatbot-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <div className="chatbot-footer">
        <p>Powered by Google Gemini AI</p>
      </div>
    </div>
  );
};

export default GeminiChatbot;
