import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Button, 
  Card, 
  CardContent, 
  Checkbox, 
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
}

const CharacterAvatar: React.FC<{ character: Character }> = ({ character }) => {
  const initials = character.name.split(' ').map(word => word[0]).join('').toUpperCase();
  
  return (
    <Box
      sx={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: character.placeholderColor || '#95a5a6',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        mr: 2
      }}
    >
      {initials}
    </Box>
  );
};

const ConversationPage: React.FC = () => {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panelConfirmed, setPanelConfirmed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system-1',
      content: 'Welcome to The Round Table! Select your panelists and click "Confirm Panel" to start a conversation.',
      sender: 'character',
      character: { id: 'system', name: 'System' },
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
        id: `system-${prev.length + 1}`,
        content: 'Your panel is ready! Ask a question to start the conversation.',
        sender: 'character',
        character: { id: 'system', name: 'System' },
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
          characters: selectedCharacters
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get responses');
      }

      const data = await response.json();

      // Add character responses to the conversation with progressive loading
      if (data.responses && data.responses.length > 0) {
        // Sort responses to show primary responses first, then interactions
        const sortedResponses = data.responses.sort((a: any, b: any) => {
          if (a.type === 'primary' && b.type === 'interaction') return -1;
          if (a.type === 'interaction' && b.type === 'primary') return 1;
          return 0;
        });

        // Add responses progressively with delays
        sortedResponses.forEach((resp: { id?: string; name: string; content: string; type?: string }, index: number) => {
          setTimeout(() => {
            const characterResponse: Message = {
              id: `character-${messages.length + index + 2}`,
              content: resp.content,
              sender: 'character',
              character: { id: resp.id || selectedCharacters[index % selectedCharacters.length], name: resp.name },
              timestamp: new Date().toISOString(),
              enableTyping: true // Enable typing effect for ALL new responses
            };
            setMessages(prev => [...prev, characterResponse]);
            
            // Stop loading after the last response
            if (index === sortedResponses.length - 1) {
              setSendingMessage(false);
            }
          }, (index + 1) * 2000); // Longer delays to allow full typing effect
        });
      } else {
        throw new Error('No responses received');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `system-error-${messages.length + 1}`,
          content: 'Sorry, there was an error getting responses from the panel. Please try again.',
          sender: 'character',
          character: { id: 'system', name: 'System' },
          timestamp: new Date().toISOString()
        }
      ]);
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
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

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          {/* Left side - Character Selection */}
          <Grid item xs={12} md={5} lg={4}>
            <Box sx={{ position: 'sticky', top: '20px' }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Select Your Panel
              </Typography>
              {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
              <Box sx={{ mt: 2, mb: 3 }}>
                <Button 
                  variant="contained" 
                  color="primary"
                  disabled={panelConfirmed || selectedCharacters.length === 0}
                  onClick={handleConfirmPanel}
                  fullWidth
                >
                  {panelConfirmed ? 'Panel Confirmed' : `Confirm Panel (${selectedCharacters.length}/3)`}
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto', pr: 1 }}>
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
            <Box sx={{ height: 'calc(100vh - 120px)' }}>
              <ConversationPanel 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                loading={sendingMessage}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default ConversationPage; 