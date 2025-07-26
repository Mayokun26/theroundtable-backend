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
  // Dynamic conversation properties
  round?: number;
  isReaction?: boolean;
  reactingTo?: string;
  isAnswer?: boolean;
  answeringTo?: string;
  convictionLevel?: number;
  isModerator?: boolean;
}

const MessageContainer = styled.div<{ $isUser: boolean; $characterName?: string }>`
  display: flex;
  flex-direction: column;
  max-width: 80%;
  margin-bottom: 36px;
  align-self: ${(props) => (props.$isUser ? 'flex-end' : 'flex-start')};
  
  @media (max-width: 768px) {
    max-width: 95%;
    margin-bottom: 28px;
  }
  
  @media (max-width: 480px) {
    max-width: 98%;
    margin-bottom: 24px;
  }
`;

const MessageBubble = styled.div<{ $isUser: boolean; $characterName?: string }>`
  padding: 24px 28px;
  border-radius: 16px;
  background: ${(props) => {
    if (props.$isUser) {
      return 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
    }
    // Character-specific backgrounds with parchment texture
    switch (props.$characterName?.toLowerCase()) {
      // Ancient Philosophers & Thinkers
      case 'socrates': return 'linear-gradient(135deg, #f3e5f5 0%, #e8eaf6 100%)'; // Purple - wisdom
      case 'plato': return 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)'; // Deep purple - idealism
      case 'aristotle': return 'linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)'; // Teal - logic
      case 'confucius': return 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)'; // Orange - harmony
      case 'lao tzu': return 'linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)'; // Light green - nature
      case 'pythagoras': return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'; // Sky blue - mathematics
      case 'marcus aurelius': return 'linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%)'; // Rose - stoicism
      case 'hypatia': return 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)'; // Lavender - knowledge
      
      // Scientists & Innovators
      case 'marie curie': return 'linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%)'; // Blue - science
      case 'albert einstein': return 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)'; // Yellow - genius
      case 'nikola tesla': return 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)'; // Electric green
      case 'galileo galilei': return 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)'; // Cyan - discovery
      case 'isaac newton': return 'linear-gradient(135deg, #f9fbe7 0%, #f0f4c3 100%)'; // Lime - gravity
      case 'charles darwin': return 'linear-gradient(135deg, #e8f5e8 0%, #a5d6a7 100%)'; // Nature green
      case 'ada lovelace': return 'linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%)'; // Pink - programming
      case 'grace hopper': return 'linear-gradient(135deg, #e0f2f1 0%, #4db6ac 100%)'; // Mint - computing
      case 'alan turing': return 'linear-gradient(135deg, #e8eaf6 0%, #9575cd 100%)'; // Purple - AI
      case 'ibn sina (avicenna)': return 'linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%)'; // Amber - medicine
      case 'ibn al-haytham': return 'linear-gradient(135deg, #e3f2fd 0%, #42a5f5 100%)'; // Blue - optics
      case 'leonardo fibonacci': return 'linear-gradient(135deg, #f1f8e9 0%, #8bc34a 100%)'; // Green - nature math
      case 'rachel carson': return 'linear-gradient(135deg, #e8f5e8 0%, #66bb6a 100%)'; // Forest green
      
      // Military Leaders & Rulers
      case 'sun tzu': return 'linear-gradient(135deg, #fff8f0 0%, #ffeedd 100%)'; // Tan - strategy
      case 'julius caesar': return 'linear-gradient(135deg, #ffebee 0%, #ef5350 100%)'; // Roman red
      case 'alexander the great': return 'linear-gradient(135deg, #fff3e0 0%, #ff9800 100%)'; // Gold - conquest
      case 'napoleon bonaparte': return 'linear-gradient(135deg, #e8eaf6 0%, #5c6bc0 100%)'; // Imperial blue
      case 'joan of arc': return 'linear-gradient(135deg, #f3e5f5 0%, #ba68c8 100%)'; // Royal purple
      case 'cleopatra': return 'linear-gradient(135deg, #fffbf0 0%, #fff4e6 100%)'; // Egyptian gold
      case 'catherine the great': return 'linear-gradient(135deg, #e8eaf6 0%, #7986cb 100%)'; // Russian blue
      case 'queen elizabeth i': return 'linear-gradient(135deg, #fff8e1 0%, #ffd54f 100%)'; // Tudor gold
      case 'mahatma gandhi': return 'linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%)'; // Saffron
      case 'nelson mandela': return 'linear-gradient(135deg, #e8f5e8 0%, #43a047 100%)'; // Hope green
      
      // Artists & Writers
      case 'leonardo da vinci': return 'linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%)'; // Renaissance gold
      case 'william shakespeare': return 'linear-gradient(135deg, #f3e5f5 0%, #ab47bc 100%)'; // Theatrical purple
      case 'michelangelo': return 'linear-gradient(135deg, #fce4ec 0%, #f06292 100%)'; // Marble pink
      case 'pablo picasso': return 'linear-gradient(135deg, #e3f2fd 0%, #29b6f6 100%)'; // Cubist blue
      case 'frida kahlo': return 'linear-gradient(135deg, #ffebee 0%, #e57373 100%)'; // Passionate red
      case 'georgia o\'keeffe': return 'linear-gradient(135deg, #fff8e1 0%, #ffb74d 100%)'; // Desert orange
      case 'jane austen': return 'linear-gradient(135deg, #f1f8e9 0%, #aed581 100%)'; // English green
      case 'virginia woolf': return 'linear-gradient(135deg, #e8eaf6 0%, #7e57c2 100%)'; // Literary purple
      case 'emily dickinson': return 'linear-gradient(135deg, #f9fbe7 0%, #cddc39 100%)'; // Recluse yellow
      case 'mary shelley': return 'linear-gradient(135deg, #e0f2f1 0%, #26a69a 100%)'; // Gothic teal
      case 'maya angelou': return 'linear-gradient(135deg, #fff3e0 0%, #ff8a65 100%)'; // Warm orange
      case 'anne frank': return 'linear-gradient(135deg, #e8f5e8 0%, #81c784 100%)'; // Hope green
      case 'frederick douglass': return 'linear-gradient(135deg, #e3f2fd 0%, #5c6bc0 100%)'; // Freedom blue
      
      // Musicians & Performers
      case 'wolfgang amadeus mozart': return 'linear-gradient(135deg, #fff8e1 0%, #fff176 100%)'; // Musical gold
      case 'martha graham': return 'linear-gradient(135deg, #fce4ec 0%, #f06292 100%)'; // Dance pink
      
      // Activists & Social Reformers
      case 'florence nightingale': return 'linear-gradient(135deg, #ffebee 0%, #ef9a9a 100%)'; // Caring pink
      case 'rosa parks': return 'linear-gradient(135deg, #e8eaf6 0%, #9575cd 100%)'; // Dignity purple
      case 'malcolm x': return 'linear-gradient(135deg, #ffebee 0%, #ef5350 100%)'; // Passionate red
      case 'mary seacole': return 'linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%)'; // Caribbean gold
      
      default:
        return 'linear-gradient(135deg, #fefefe 0%, #f8f8f8 100%)';
    }
  }};
  border: ${(props) => {
    if (props.$isUser) {
      return '2px solid #dee2e6';
    }
    // Character-specific borders
    switch (props.$characterName?.toLowerCase()) {
      // Ancient Philosophers & Thinkers
      case 'socrates': return '2px solid #ce93d8'; // Purple
      case 'plato': return '2px solid #9575cd'; // Deep purple  
      case 'aristotle': return '2px solid #4db6ac'; // Teal
      case 'confucius': return '2px solid #ffb74d'; // Orange
      case 'lao tzu': return '2px solid #aed581'; // Light green
      case 'pythagoras': return '2px solid #42a5f5'; // Sky blue
      case 'marcus aurelius': return '2px solid #f06292'; // Rose
      case 'hypatia': return '2px solid #ba68c8'; // Lavender
      
      // Scientists & Innovators
      case 'marie curie': return '2px solid #bbdefb'; // Blue
      case 'albert einstein': return '2px solid #fff176'; // Yellow
      case 'nikola tesla': return '2px solid #66bb6a'; // Electric green
      case 'galileo galilei': return '2px solid #4fc3f7'; // Cyan
      case 'isaac newton': return '2px solid #dce775'; // Lime
      case 'charles darwin': return '2px solid #81c784'; // Nature green
      case 'ada lovelace': return '2px solid #f48fb1'; // Pink
      case 'grace hopper': return '2px solid #26a69a'; // Mint
      case 'alan turing': return '2px solid #7986cb'; // Purple
      case 'ibn sina (avicenna)': return '2px solid #ff9800'; // Amber
      case 'ibn al-haytham': return '2px solid #2196f3'; // Blue
      case 'leonardo fibonacci': return '2px solid #66bb6a'; // Green
      case 'rachel carson': return '2px solid #4caf50'; // Forest green
      
      // Military Leaders & Rulers
      case 'sun tzu': return '2px solid #d7ccc8'; // Tan
      case 'julius caesar': return '2px solid #f44336'; // Roman red
      case 'alexander the great': return '2px solid #ff9800'; // Gold
      case 'napoleon bonaparte': return '2px solid #3f51b5'; // Imperial blue
      case 'joan of arc': return '2px solid #9c27b0'; // Royal purple
      case 'cleopatra': return '2px solid #ffe082'; // Egyptian gold
      case 'catherine the great': return '2px solid #5c6bc0'; // Russian blue
      case 'queen elizabeth i': return '2px solid #ffc107'; // Tudor gold
      case 'mahatma gandhi': return '2px solid #ff9800'; // Saffron
      case 'nelson mandela': return '2px solid #388e3c'; // Hope green
      
      // Artists & Writers
      case 'leonardo da vinci': return '2px solid #ff9800'; // Renaissance gold
      case 'william shakespeare': return '2px solid #8e24aa'; // Theatrical purple
      case 'michelangelo': return '2px solid #e91e63'; // Marble pink
      case 'pablo picasso': return '2px solid #03a9f4'; // Cubist blue
      case 'frida kahlo': return '2px solid #f44336'; // Passionate red
      case 'georgia o\'keeffe': return '2px solid #ff9800'; // Desert orange
      case 'jane austen': return '2px solid #8bc34a'; // English green
      case 'virginia woolf': return '2px solid #673ab7'; // Literary purple
      case 'emily dickinson': return '2px solid #cddc39'; // Recluse yellow
      case 'mary shelley': return '2px solid #009688'; // Gothic teal
      case 'maya angelou': return '2px solid #ff7043'; // Warm orange
      case 'anne frank': return '2px solid #66bb6a'; // Hope green
      case 'frederick douglass': return '2px solid #3f51b5'; // Freedom blue
      
      // Musicians & Performers  
      case 'wolfgang amadeus mozart': return '2px solid #ffc107'; // Musical gold
      case 'martha graham': return '2px solid #e91e63'; // Dance pink
      
      // Activists & Social Reformers
      case 'florence nightingale': return '2px solid #f48fb1'; // Caring pink
      case 'rosa parks': return '2px solid #7986cb'; // Dignity purple
      case 'malcolm x': return '2px solid #f44336'; // Passionate red
      case 'mary seacole': return '2px solid #ff9800'; // Caribbean gold
      
      default:
        return '2px solid #e0e0e0';
    }
  }};
  color: #2c2c2c;
  margin-top: 12px;
  position: relative;
  border-bottom-right-radius: ${(props) => (props.$isUser ? '6px' : '16px')};
  border-bottom-left-radius: ${(props) => (props.$isUser ? '16px' : '6px')};
  font-weight: ${(props) => (props.$isUser ? '500' : '400')};
  line-height: 1.8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  
  // Add subtle texture overlay for parchment effect
  background-image: ${(props) => !props.$isUser ? `
    radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 183, 3, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(255, 138, 101, 0.03) 0%, transparent 50%)
  ` : 'none'};
  
  @media (max-width: 768px) {
    padding: 20px 18px;
    font-size: 1rem;
    border-radius: 14px;
  }
  
  @media (max-width: 480px) {
    padding: 18px 16px;
    font-size: 1rem;
    border-radius: 12px;
  }
`;

const MessageSender = styled.div<{ $isUser: boolean; $characterName?: string }>`
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 10px;
  color: ${(props) => {
    if (props.$isUser) {
      return '#495057';
    }
    // Character-specific name colors
    switch (props.$characterName?.toLowerCase()) {
      // Ancient Philosophers & Thinkers
      case 'socrates': return '#7b1fa2'; // Purple
      case 'plato': return '#512da8'; // Deep purple  
      case 'aristotle': return '#00695c'; // Teal
      case 'confucius': return '#e65100'; // Orange
      case 'lao tzu': return '#558b2f'; // Light green
      case 'pythagoras': return '#1565c0'; // Sky blue
      case 'marcus aurelius': return '#c2185b'; // Rose
      case 'hypatia': return '#8e24aa'; // Lavender
      
      // Scientists & Innovators
      case 'marie curie': return '#1565c0'; // Blue
      case 'albert einstein': return '#f57f17'; // Yellow/amber
      case 'nikola tesla': return '#2e7d32'; // Electric green
      case 'galileo galilei': return '#0277bd'; // Cyan
      case 'isaac newton': return '#827717'; // Lime
      case 'charles darwin': return '#388e3c'; // Nature green
      case 'ada lovelace': return '#c2185b'; // Pink
      case 'grace hopper': return '#00695c'; // Mint
      case 'alan turing': return '#512da8'; // Purple
      case 'ibn sina (avicenna)': return '#e65100'; // Amber
      case 'ibn al-haytham': return '#1976d2'; // Blue
      case 'leonardo fibonacci': return '#2e7d32'; // Green
      case 'rachel carson': return '#2e7d32'; // Forest green
      
      // Military Leaders & Rulers
      case 'sun tzu': return '#bf360c'; // Tan/brown
      case 'julius caesar': return '#d32f2f'; // Roman red
      case 'alexander the great': return '#e65100'; // Gold
      case 'napoleon bonaparte': return '#303f9f'; // Imperial blue
      case 'joan of arc': return '#7b1fa2'; // Royal purple
      case 'cleopatra': return '#e65100'; // Egyptian gold
      case 'catherine the great': return '#3949ab'; // Russian blue
      case 'queen elizabeth i': return '#f57c00'; // Tudor gold
      case 'mahatma gandhi': return '#e65100'; // Saffron
      case 'nelson mandela': return '#2e7d32'; // Hope green
      
      // Artists & Writers
      case 'leonardo da vinci': return '#e65100'; // Renaissance gold
      case 'william shakespeare': return '#6a1b9a'; // Theatrical purple
      case 'michelangelo': return '#c2185b'; // Marble pink
      case 'pablo picasso': return '#0277bd'; // Cubist blue
      case 'frida kahlo': return '#d32f2f'; // Passionate red
      case 'georgia o\'keeffe': return '#e65100'; // Desert orange
      case 'jane austen': return '#558b2f'; // English green
      case 'virginia woolf': return '#512da8'; // Literary purple
      case 'emily dickinson': return '#827717'; // Recluse yellow
      case 'mary shelley': return '#00695c'; // Gothic teal
      case 'maya angelou': return '#d84315'; // Warm orange
      case 'anne frank': return '#388e3c'; // Hope green
      case 'frederick douglass': return '#303f9f'; // Freedom blue
      
      // Musicians & Performers  
      case 'wolfgang amadeus mozart': return '#f57c00'; // Musical gold
      case 'martha graham': return '#c2185b'; // Dance pink
      
      // Activists & Social Reformers
      case 'florence nightingale': return '#c2185b'; // Caring pink
      case 'rosa parks': return '#512da8'; // Dignity purple
      case 'malcolm x': return '#d32f2f'; // Passionate red
      case 'mary seacole': return '#e65100'; // Caribbean gold
      
      default:
        return '#37474f';
    }
  }};
`;

// Function to enhance text with bold colors, italics for quotes, etc.
const enhanceText = (text: string): string => {
  let enhanced = text;
  
  // Bold color words
  const colorWords = ['gold', 'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'silver', 'black', 'white'];
  colorWords.forEach(color => {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    enhanced = enhanced.replace(regex, `**${color}**`);
  });
  
  // Italicize quoted text and poetic expressions
  enhanced = enhanced.replace(/"([^"]+)"/g, '*"$1"*');
  enhanced = enhanced.replace(/'([^']+)'/g, "*'$1'*");
  
  // Removed historical terms bolding for more consistent formatting
  
  return enhanced;
};

// Convert enhanced markdown-like text to JSX
const renderEnhancedText = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    } else if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    } else {
      return <span key={index}>{part}</span>;
    }
  });
};

const TypingText: React.FC<{ text: string; speed?: number; messageId?: string; onComplete?: () => void }> = ({ text, speed = 15, messageId, onComplete }) => {
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
      const char = text[currentIndex];
      
      // Variable speed based on character type for more natural typing
      let charDelay = speed;
      if (char === '.' || char === '!' || char === '?') charDelay = speed * 4; // Pause at sentence end
      else if (char === ',' || char === ';') charDelay = speed * 2; // Pause at commas
      else if (char === ' ') charDelay = speed * 0.8; // Slightly faster for spaces
      
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, charDelay);

      return () => clearTimeout(timer);
    } else if (currentIndex >= text.length && !isComplete) {
      setIsComplete(true);
      onComplete?.(); // Notify when typing is complete
    }
  }, [currentIndex, text, speed, isComplete, onComplete]);

  return <span>{renderEnhancedText(displayedText)}{!isComplete && <span className="typing-cursor">|</span>}</span>;
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
  messageId,
  round,
  isReaction,
  reactingTo,
  isAnswer,
  answeringTo,
  convictionLevel,
  isModerator = false
}) => {
  const isUser = sender === 'user';
  const senderName = isUser ? 'You' : character?.name || 'Unknown';
  const [showContent, setShowContent] = useState(!enableTyping || isUser);
  
  // Create dynamic header based on interaction type
  const getInteractionHeader = () => {
    if (isReaction && reactingTo) {
      const convictionEmoji = convictionLevel === 10 ? '🔥' : convictionLevel === 9 ? '💥' : '⚡';
      return `${convictionEmoji} Reacting to ${reactingTo}`;
    }
    if (isAnswer && answeringTo) {
      return `💬 Responding to ${answeringTo}`;
    }
    if (round && round > 1) {
      return `🔄 Round ${round}`;
    }
    return null;
  };
  
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
      // For typing effect, show entire text with typing animation and enhanced formatting
      const enhancedText = enhanceText(text);
      return (
        <div style={{ lineHeight: '1.7' }}>
          <TypingText text={enhancedText} speed={typingSpeed} messageId={messageId} />
        </div>
      );
    } else {
      // For normal display, break into paragraphs with enhanced formatting
      const paragraphs = text.split('\n').filter(p => p.trim());
      return paragraphs.map((paragraph, index) => (
        <p key={index} style={{ margin: '0 0 16px 0', lineHeight: '1.8' }}>
          {renderEnhancedText(enhanceText(paragraph))}
        </p>
      ));
    }
  };

  // Handle sequential typing: name first, then content
  useEffect(() => {
    if (enableTyping && !isUser && senderName) {
      // Show content after name finishes typing (estimate based on name length)
      const nameTypingDuration = senderName.length * 50; // 50ms per character for name
      const timer = setTimeout(() => {
        setShowContent(true);
      }, nameTypingDuration + 200); // Small buffer
      
      return () => clearTimeout(timer);
    }
  }, [enableTyping, isUser, senderName]);

  return (
    <TypingStyles>
      <MessageContainer $isUser={isUser} $characterName={character?.name}>
        <MessageSender $isUser={isUser} $characterName={character?.name}>
          {enableTyping && !isUser ? (
            <TypingText text={senderName} speed={50} messageId={`${messageId}-name`} />
          ) : (
            senderName
          )}
        </MessageSender>
        {getInteractionHeader() && (
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#666', 
            fontStyle: 'italic', 
            marginBottom: '8px',
            paddingLeft: '4px'
          }}>
            {getInteractionHeader()}
          </div>
        )}
        {showContent && (
          <MessageBubble $isUser={isUser} $characterName={character?.name}>
            {formatContent(content)}
          </MessageBubble>
        )}
      </MessageContainer>
    </TypingStyles>
  );
};

export default MessageBubbleComponent; 