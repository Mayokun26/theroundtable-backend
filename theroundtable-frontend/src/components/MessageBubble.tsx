import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface MessageProps {
  content: string;
  sender: 'user' | 'character';
  character?: {
    id: string;
    name: string;
  };
  timestamp: string;
  enableTyping?: boolean;
  typingSpeed?: number;
  messageId?: string;
}

const MessageContainer = styled.div<{ $isUser: boolean }>`
  display: flex;
  flex-direction: column;
  max-width: 80%;
  margin-bottom: 16px;
  align-self: ${(props) => (props.$isUser ? 'flex-end' : 'flex-start')};
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  padding: 12px 16px;
  border-radius: 12px;
  background-color: ${(props) => (props.$isUser ? '#e3f2fd' : '#f1f1f1')};
  color: #333;
  margin-top: 4px;
  position: relative;
  border-bottom-right-radius: ${(props) => (props.$isUser ? '4px' : '12px')};
  border-bottom-left-radius: ${(props) => (props.$isUser ? '12px' : '4px')};
`;

const MessageSender = styled.div<{ $isUser: boolean }>`
  font-weight: 600;
  font-size: 14px;
  color: ${(props) => (props.$isUser ? '#1976d2' : '#4a6fa5')};
`;

const MessageTime = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  align-self: flex-end;
`;

const TypingText: React.FC<{ text: string; speed?: number; messageId?: string }> = ({ text, speed = 25, messageId }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text, messageId]);

  useEffect(() => {
    if (currentIndex < text.length && !isComplete) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (currentIndex >= text.length && !isComplete) {
      setIsComplete(true);
    }
  }, [currentIndex, text, speed, isComplete]);

  return <span>{displayedText}{!isComplete && <span className="typing-cursor">|</span>}</span>;
};

const TypingStyles = styled.div`
  .typing-cursor {
    animation: blink 1s infinite;
    font-weight: bold;
    color: #1976d2;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;

const MessageBubbleComponent: React.FC<MessageProps> = ({ 
  content, 
  sender, 
  character, 
  timestamp, 
  enableTyping = false,
  typingSpeed = 25,
  messageId
}) => {
  const isUser = sender === 'user';
  const senderName = isUser ? 'You' : character?.name || 'Unknown';
  
  // Format timestamp
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Break content into sentences for better readability and typing effect
  const formatContent = (text: string) => {
    if (enableTyping && !isUser) {
      // For typing effect, show entire text with typing animation
      return (
        <div style={{ lineHeight: '1.5' }}>
          <TypingText text={text} speed={typingSpeed} messageId={messageId} />
        </div>
      );
    } else {
      // For normal display, break into paragraphs
      const paragraphs = text.split('\n').filter(p => p.trim());
      return paragraphs.map((paragraph, index) => (
        <p key={index} style={{ margin: '0 0 8px 0', lineHeight: '1.5' }}>
          {paragraph}
        </p>
      ));
    }
  };

  return (
    <TypingStyles>
      <MessageContainer $isUser={isUser}>
        <MessageSender $isUser={isUser}>{senderName}</MessageSender>
        <MessageBubble $isUser={isUser}>
          {formatContent(content)}
        </MessageBubble>
        <MessageTime>{formatTime(timestamp)}</MessageTime>
      </MessageContainer>
    </TypingStyles>
  );
};

export default MessageBubbleComponent; 