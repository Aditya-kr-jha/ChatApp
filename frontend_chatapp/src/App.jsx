import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ChatRoom from './components/ChatRoom';
import MessageInput from './components/MessageInput';

function App() {
  const [username, setUsername] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const webSocketRef = useRef(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setLoggedIn(true);
      connectWebSocket();
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:8000/ws/${username}`);
    
    ws.onopen = () => {
      console.log('Connected to websocket server');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message received:', data);
      setMessages(prev => [...prev, data]);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from websocket server');
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    webSocketRef.current = ws;
  };

  const sendMessage = (message) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify({ message }));
    }
  };

  useEffect(() => {
    // Cleanup WebSocket connection when component unmounts
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Simple Chat App</h1>
      </header>
      
      {!loggedIn ? (
        <div className="login-container">
          <h2>Join the Chat</h2>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button type="submit">Join</button>
          </form>
        </div>
      ) : (
        <div className="chat-container">
          <div className="user-info">
            <p>Logged in as: <strong>{username}</strong></p>
            <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <ChatRoom messages={messages} currentUser={username} />
          <MessageInput sendMessage={sendMessage} />
        </div>
      )}
    </div>
  );
}

export default App;