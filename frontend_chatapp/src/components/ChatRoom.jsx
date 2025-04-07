import React, { useEffect, useRef } from 'react';

function ChatRoom({ messages, currentUser }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="chat-room">
      <div className="messages-container">
        {messages.map((msg, index) => {
          let messageClass = "message system-message";
          
          if (msg.type === "chat_message") {
            messageClass = msg.username === currentUser 
              ? "message user-message" 
              : "message other-message";
          }
          
          return (
            <div key={index} className={messageClass}>
              {msg.type === "chat_message" && (
                <div className="message-header">
                  <span className="username">{msg.username}</span>
                  <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              )}
              <div className="message-body">{msg.message}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatRoom;