import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './WorldChat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function WorldChat({ user }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to World Chat');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from World Chat');
      setIsConnected(false);
    });

    // Receive previous messages when connecting
    newSocket.on('previous_messages', (previousMessages) => {
      setMessages(previousMessages);
    });

    // Receive new messages
    newSocket.on('receive_message', (message) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, message];
        // Keep only last 20 messages on client side too
        return updatedMessages.slice(-20);
      });
    });

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !isConnected) return;

    const messageData = {
      username: user?.username || 'Anonymous',
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="world-chat-container">
      <div className="chat-header">
        <h2>🌍 World Chat</h2>
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '● Online' : '○ Offline'}
        </span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Be the first to say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message ${msg.username === user?.username ? 'own-message' : 'other-message'}`}
            >
              <div className="message-header">
                <span className="message-username">{msg.username}</span>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isConnected ? "Type your message..." : "Connecting..."}
          disabled={!isConnected}
          maxLength={500}
          className="chat-input"
        />
        <button 
          type="submit" 
          disabled={!isConnected || !newMessage.trim()}
          className="chat-send-button"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default WorldChat;
