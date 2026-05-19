import { useState } from 'react';
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import './PMChatPanel.css';

interface PMChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Array<{ id: string; content: string; author: string; timestamp: string; type: 'message' | 'system' | 'user' }>;
  onSendMessage: (content: string) => void;
  projectName?: string;
}

export function PMChatPanel({ isOpen, onClose, messages, onSendMessage, projectName }: PMChatPanelProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`pm-chat-panel ${isOpen ? 'active' : ''}`}>
      {isOpen && (
        <div className="pm-chat-panel-container">
          <div className="panel-header">
            <div className="header-info">
              <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
              <span>
                {projectName || 'Project Messages'}
              </span>
            </div>
            <button onClick={onClose} className="header-close-btn">
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="panel-messages">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`message-item ${msg.type === 'user' ? 'message-user' : ''}`}
              >
                <div className="message-author">{msg.author}</div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}
          </div>
          <div className="panel-input">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={3}
            />
            <button onClick={handleSend} className="send-btn">
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
