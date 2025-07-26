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
  enableTyping?: boolean;
  // Dynamic conversation properties
  round?: number;
  isReaction?: boolean;
  reactingTo?: string;
  isAnswer?: boolean;
  answeringTo?: string;
  convictionLevel?: number;
  isModerator?: boolean;
}

interface ConversationPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading: boolean;
  selectedCharacterCount?: number;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  
  @media (max-width: 768px) {
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const Header = styled.div`
  background-color: #4285f4;
  color: white;
  padding: 16px;
  font-weight: 600;
  
  @media (max-width: 768px) {
    padding: 12px;
    font-size: 0.9rem;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  
  @media (max-width: 768px) {
    padding: 8px;
  }
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  gap: 12px;
  background-color: #ffffff;
  
  @media (max-width: 768px) {
    padding: 16px 12px;
    gap: 10px;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
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
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.9rem;
  }
`;

const SendButton = styled.button<{ disabled: boolean }>`
  padding: 10px 16px;
  background-color: ${(props) => (props.disabled ? '#cccccc' : '#4285f4')};
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 1rem;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: background-color 0.3s ease;
  white-space: nowrap;
  
  &:hover {
    background-color: ${(props) => (props.disabled ? '#cccccc' : '#3367d6')};
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    font-size: 0.9rem;
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


const ConversationPanel: React.FC<ConversationPanelProps> = ({ messages, onSendMessage, loading, selectedCharacterCount = 0 }) => {
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
          // Only enable typing for messages that explicitly have enableTyping=true
          // Allow typing even during loading for sequential character responses
          const shouldEnableTyping = message.sender === 'character' && 
                                    message.enableTyping === true;
          
          return (
            <MessageBubble
              key={`${message.id}-${message.timestamp}`}
              content={message.content}
              sender={message.sender}
              character={message.character}
              timestamp={message.timestamp}
              enableTyping={shouldEnableTyping}
              typingSpeed={15}
              messageId={message.id}
              round={message.round}
              isReaction={message.isReaction}
              reactingTo={message.reactingTo}
              isAnswer={message.isAnswer}
              answeringTo={message.answeringTo}
              convictionLevel={message.convictionLevel}
              isModerator={message.isModerator}
            />
          );
        })}
        {loading && (
          <LoadingIndicator>
            {selectedCharacterCount === 1 
              ? 'The panelist is thinking' 
              : 'The panelists are thinking'
            }
          </LoadingIndicator>
        )}
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
            autoComplete="off"
            autoCapitalize="sentences"
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