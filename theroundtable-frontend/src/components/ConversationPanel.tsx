import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import MessageBubble from './MessageBubble';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  character?: {
    id: string;
    name: string;
  };
  timestamp: string;
  isTyping?: boolean;
}

interface ConversationPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Header = styled.div`
  background-color: #4285f4;
  color: white;
  padding: 16px;
  font-weight: 600;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 12px;
  border-top: 1px solid #e0e0e0;
`;

const Input = styled.input`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 1rem;
  outline: none;
  
  &:focus {
    border-color: #4285f4;
  }
`;

const SendButton = styled.button<{ disabled: boolean }>`
  margin-left: 12px;
  padding: 10px 16px;
  background-color: ${(props) => (props.disabled ? '#cccccc' : '#4285f4')};
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 1rem;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: ${(props) => (props.disabled ? '#cccccc' : '#3367d6')};
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  margin: 8px 0;
  
  &::after {
    content: "...";
    animation: dots 1.5s infinite;
    font-weight: bold;
  }
  
  @keyframes dots {
    0%, 20% {
      content: ".";
    }
    40% {
      content: "..";
    }
    60%, 100% {
      content: "...";
    }
  }
`;

// Typing effect component
const TypingText: React.FC<{ text: string; speed?: number; onComplete?: () => void }> = ({ 
  text, 
  speed = 30, 
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <span>{displayedText}<span className="cursor">|</span></span>;
};

const TypingWrapper = styled.div`
  .cursor {
    animation: blink 1s infinite;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;

const ConversationPanel: React.FC<ConversationPanelProps> = ({ messages, onSendMessage, loading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <Container>
      <Header>Round Table Conversation</Header>
      <MessagesContainer>
        {messages.map((message, index) => {
          // Enable typing effect for character messages that have enableTyping set
          const shouldEnableTyping = message.sender === 'character' && 
                                    message.enableTyping && 
                                    !loading;
          
          return (
            <MessageBubble
              key={message.id}
              content={message.content}
              sender={message.sender}
              character={message.character}
              timestamp={message.timestamp}
              enableTyping={shouldEnableTyping}
              typingSpeed={25}
            />
          );
        })}
        {loading && <LoadingIndicator>The panel is thinking</LoadingIndicator>}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <form onSubmit={handleSubmit}>
        <InputContainer>
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the round table..."
            disabled={loading}
          />
          <SendButton type="submit" disabled={loading || !input.trim()}>
            Send
          </SendButton>
        </InputContainer>
      </form>
    </Container>
  );
};

export default ConversationPanel; 