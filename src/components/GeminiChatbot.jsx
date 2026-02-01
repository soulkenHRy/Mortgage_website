import { useState, useEffect, useRef } from 'react';
import './GeminiChatbot.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const GeminiChatbot = ({ currentUser, isVerified }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI mortgage assistant. I can help you with questions about mortgages, home buying, interest rates, and more. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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
      // Call backend API instead of directly using Gemini
      const response = await fetch(`${API_URL}/api/chat/gemini`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.slice(-5),
          // Include user info for activity tracking (if logged in)
          username: currentUser || undefined,
          email: localStorage.getItem('userEmail') || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Show the actual error for debugging
      const errorMessage = error.message || 'Sorry, I encountered an error. Please try again.';
      
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

  // Format message with markdown-like syntax
  const formatMessage = (content) => {
    // Split into lines
    const lines = content.split('\n');
    
    return lines.map((line, i) => {
      // Check if line is a header (starts with **)
      const isHeader = line.match(/^\*\*(.+?)\*\*:?$/);
      
      // Check if line is a bullet point
      const isBullet = line.match(/^(\s*)•\s+(.+)$/);
      const isSubBullet = line.match(/^\s{4,}•\s+(.+)$/);
      
      // Process bold text within line
      const processBold = (text) => {
        const parts = text.split(/\*\*(.+?)\*\*/g);
        return parts.map((part, idx) => 
          idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
        );
      };
      
      if (isHeader) {
        return (
          <div key={i} className="ai-header">
            {processBold(line)}
          </div>
        );
      }
      
      if (isSubBullet) {
        return (
          <div key={i} className="ai-sub-bullet">
            <span className="bullet">◦</span>
            <span>{processBold(isSubBullet[1])}</span>
          </div>
        );
      }
      
      if (isBullet) {
        return (
          <div key={i} className="ai-bullet">
            <span className="bullet">•</span>
            <span>{processBold(isBullet[2])}</span>
          </div>
        );
      }
      
      // Empty line = paragraph break
      if (line.trim() === '') {
        return <div key={i} className="ai-paragraph-break" />;
      }
      
      // Regular text
      return (
        <div key={i} className="ai-text">
          {processBold(line)}
        </div>
      );
    });
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
              <div className="message-text">
                {message.role === 'assistant' ? formatMessage(message.content) : message.content}
              </div>
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
