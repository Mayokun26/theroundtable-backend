import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Button, 
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConversationPanel from '../components/ConversationPanel';
import CharacterGrid from '../components/CharacterGrid';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface Character {
  id: string;
  name: string;
  category: string;
  era: string;
  description: string;
  traits: string[];
  imageUrl: string;
  placeholderColor?: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  character?: {
    id: string;
    name: string;
  };
  timestamp: string;
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


const ConversationPage: React.FC = () => {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panelConfirmed, setPanelConfirmed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'herald-1',
      content: 'Welcome to The Round Table! Select your panelists and click "Confirm Panel" to start a conversation.',
      sender: 'character',
      character: { id: 'herald', name: 'Round Table Herald' },
      timestamp: new Date().toISOString()
    }
  ]);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        // Check API health first
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const healthResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (healthResponse.ok) {
            // Load characters from backend API
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/characters`);
            if (!response.ok) {
              throw new Error('Failed to fetch characters');
            }
            const data = await response.json();
            setCharacters(Array.isArray(data.data) ? data.data : []);
          } else {
            throw new Error('API health check failed');
          }
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching characters:', err);
        // Show fallback characters if API fails
        setCharacters([
          {
            id: '1',
            name: 'Socrates',
            category: 'Philosopher',
            era: 'Ancient Greece',
            description: 'Classical Greek philosopher credited as the founder of Western philosophy.',
            traits: ['questioning', 'analytical', 'ironic', 'ethical'],
            imageUrl: '/images/characters/socrates.svg',
            placeholderColor: '#3498db'
          },
          {
            id: '2',
            name: 'Marie Curie',
            category: 'Scientist',
            era: '19th-20th Century',
            description: 'Pioneer in research on radioactivity and the first woman to win a Nobel Prize.',
            traits: ['determined', 'focused', 'diligent'],
            imageUrl: '/images/characters/marie-curie.svg',
            placeholderColor: '#e74c3c'
          },
          {
            id: '3',
            name: 'Sun Tzu',
            category: 'Military Strategist',
            era: 'Ancient China',
            description: 'Chinese general and military strategist, author of The Art of War.',
            traits: ['strategic', 'disciplined', 'observant', 'pragmatic'],
            imageUrl: '/images/characters/sun-tzu.svg',
            placeholderColor: '#f39c12'
          }
        ]);
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacters(prev => {
      if (prev.includes(characterId)) {
        return prev.filter(id => id !== characterId);
      } else {
        return [...prev, characterId];
      }
    });
  };

  const handleConfirmPanel = () => {
    if (selectedCharacters.length === 0) {
      setError('Please select at least one character for your panel.');
      return;
    }

    setPanelConfirmed(true);
    setMessages(prev => [
      ...prev,
      {
        id: `moderator-${prev.length + 1}`,
        content: 'Your panel is ready! Ask a question to start the conversation.',
        sender: 'character',
        character: { id: 'moderator', name: 'Round Table Moderator' },
        timestamp: new Date().toISOString()
      }
    ]);
    setError('');
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || selectedCharacters.length === 0) return;

    // Add user message to the conversation
    const userMessage: Message = {
      id: `user-${messages.length + 1}`,
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setSendingMessage(true);

    try {
      // Send the message to the API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          characters: selectedCharacters,
          conversationHistory: messages
            .filter(msg => msg.sender === 'character' && !msg.character?.id?.includes('herald') && !msg.character?.id?.includes('moderator'))
            .map(msg => ({
              speaker: msg.character?.name || 'Unknown',
              message: msg.content
            }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get responses');
      }

      const data = await response.json();

      // Add character responses to the conversation with progressive loading
      if (data.responses && data.responses.length > 0) {
        // Sort responses to show primary responses first, then interactions
        const sortedResponses = data.responses.sort((a: { type?: string }, b: { type?: string }) => {
          if (a.type === 'primary' && b.type === 'interaction') return -1;
          if (a.type === 'interaction' && b.type === 'primary') return 1;
          return 0;
        });

        // Add responses one at a time with proper sequential typing
        const addResponsesSequentially = (responses: any[], index = 0) => {
          if (index >= responses.length) {
            setSendingMessage(false);
            return;
          }
          
          const resp = responses[index];
          const characterResponse: Message = {
            id: `character-${Date.now()}-${index}`, // More unique IDs
            content: resp.content,
            sender: 'character',
            character: { id: resp.characterId || resp.id || selectedCharacters[index % selectedCharacters.length], name: resp.name },
            timestamp: resp.timestamp || new Date().toISOString(),
            enableTyping: true, // Enable typing effect for better UX
            // Dynamic conversation properties
            round: resp.round,
            isReaction: resp.isReaction,
            reactingTo: resp.reactingTo,
            isAnswer: resp.isAnswer,
            answeringTo: resp.answeringTo,
            convictionLevel: resp.convictionLevel,
            isModerator: resp.isModerator
          };
          
          // Add this message and disable typing for all previous messages
          setMessages(prev => {
            const updatedMessages = prev.map(msg => ({
              ...msg,
              enableTyping: false // Disable typing for all previous messages
            }));
            return [...updatedMessages, characterResponse];
          });
          
          // Wait for this message to finish typing, then add the next one
          const estimatedTypingTime = resp.content.length * 15 + 2000; // 15ms per char + 2s buffer
          setTimeout(() => {
            addResponsesSequentially(responses, index + 1);
          }, estimatedTypingTime);
        };
        
        // Start the sequential process
        addResponsesSequentially(sortedResponses);
      } else {
        throw new Error('No responses received');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `moderator-error-${messages.length + 1}`,
          content: 'Sorry, there was an error getting responses from the panel. Please try again.',
          sender: 'character',
          character: { id: 'moderator', name: 'Round Table Moderator' },
          timestamp: new Date().toISOString()
        }
      ]);
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{ backgroundColor: '#f5f5f5' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Head>
        <title>Start a Conversation - The Round Table</title>
        <meta name="description" content="Have a conversation with historical figures, legendary characters, and fictional personalities." />
      </Head>

      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/')} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            The Round Table Conversation
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ mt: 2, mx: { xs: 0.5, sm: 2 }, px: { xs: 0.5, sm: 2 } }}>
        <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
          {/* Left side - Character Selection */}
          <Grid item xs={12} md={5} lg={4}>
            <Box sx={{ 
              position: { xs: 'static', md: 'sticky' }, 
              top: '20px',
              mb: { xs: 2, md: 0 }
            }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ 
                fontSize: { xs: '1.1rem', sm: '1.5rem' },
                fontWeight: 'bold',
                mb: { xs: 1.5, sm: 2 }
              }}>
                Select Your Panel
              </Typography>
              {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
              <Box sx={{ mt: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  disabled={panelConfirmed || selectedCharacters.length === 0}
                  onClick={handleConfirmPanel}
                  fullWidth
                  sx={{
                    py: { xs: 1.5, sm: 1.5 },
                    fontSize: { xs: '1rem', sm: '1rem' },
                    fontWeight: 'bold',
                    minHeight: { xs: '48px', sm: '44px' },
                    borderRadius: { xs: 2, sm: 1.5 }
                  }}
                >
                  {panelConfirmed ? 'Panel Confirmed' : `Confirm Panel (${selectedCharacters.length}/3)`}
                </Button>
              </Box>
              
              <Box sx={{ 
                maxHeight: { xs: '400px', sm: '500px', md: 'calc(100vh - 240px)' }, 
                overflow: 'auto', 
                pr: { xs: 0.5, sm: 1 },
                '&::-webkit-scrollbar': {
                  width: { xs: '4px', sm: '6px' }
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '10px'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#c1c1c1',
                  borderRadius: '10px'
                }
              }}>
                <CharacterGrid 
                  characters={characters}
                  selectedCharacters={selectedCharacters}
                  onCharacterSelect={panelConfirmed ? undefined : handleCharacterSelect}
                  maxSelection={3}
                  showSearch={true}
                />
              </Box>
            </Box>
          </Grid>
          
          {/* Right side - Conversation */}
          <Grid item xs={12} md={7} lg={8}>
            <Box sx={{ 
              height: { 
                xs: 'calc(100vh - 120px)', 
                sm: 'calc(100vh - 140px)', 
                md: 'calc(100vh - 120px)' 
              },
              minHeight: { xs: '300px', sm: '400px' }
            }}>
              <ConversationPanel 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                loading={sendingMessage}
                selectedCharacterCount={selectedCharacters.length}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ConversationPage; 