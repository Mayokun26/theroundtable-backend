import React from 'react';
import { 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  Typography, 
  Chip, 
  Box, 
  CardActions,
  Button
} from '@mui/material';
import { useRouter } from 'next/router';

interface Character {
  id: string;
  name: string;
  category?: string;
  era?: string;
  description?: string;
  traits?: string[];
  imageUrl?: string;
}

interface CharacterGridProps {
  characters: Character[];
}

const CharacterGrid: React.FC<CharacterGridProps> = ({ characters = [] }) => {
  const router = useRouter();
  
  const characterList = React.useMemo(() => {
    if (characters.length === 0) {
      // If no characters provided, render comprehensive character list
      return [
        {
          id: '1',
          name: 'Socrates',
          category: 'Philosopher',
          era: 'Ancient Greece',
          description: 'Classical Greek philosopher credited as the founder of Western philosophy.',
          traits: ['questioning', 'analytical', 'ironic', 'ethical'],
          imageUrl: '/images/characters/socrates.jpg'
        },
        {
          id: '2',
          name: 'Marie Curie',
          category: 'Scientist',
          era: '19th-20th Century',
          description: 'Pioneer in research on radioactivity and the first woman to win a Nobel Prize.',
          traits: ['determined', 'focused', 'diligent'],
          imageUrl: '/images/characters/marie-curie.jpg'
        },
        {
          id: '3',
          name: 'Sun Tzu',
          category: 'Military Strategist',
          era: 'Ancient China',
          description: 'Chinese general and military strategist, author of The Art of War.',
          traits: ['strategic', 'disciplined', 'observant', 'pragmatic'],
          imageUrl: '/images/characters/sun-tzu.jpg'
        },
        {
          id: '4',
          name: 'Leonardo da Vinci',
          category: 'Polymath',
          era: 'Renaissance',
          description: 'Italian Renaissance polymath whose areas of interest included invention, drawing, painting, sculpture, architecture, science, music, mathematics, engineering, literature, anatomy, geology, astronomy, botany, paleontology, and cartography.',
          traits: ['creative', 'innovative', 'analytical', 'curious'],
          imageUrl: '/images/characters/leonardo.jpg'
        },
        {
          id: '5',
          name: 'Cleopatra',
          category: 'Ruler',
          era: 'Ancient Egypt',
          description: 'Last active ruler of the Ptolemaic Kingdom of Egypt, known for her intelligence, political acumen, and romantic relationships with Julius Caesar and Mark Antony.',
          traits: ['strategic', 'charismatic', 'diplomatic', 'ambitious'],
          imageUrl: '/images/characters/cleopatra.jpg'
        },
        {
          id: '6',
          name: 'Confucius',
          category: 'Philosopher',
          era: 'Ancient China',
          description: 'Chinese philosopher and politician who is widely considered one of the most important and influential individuals in human history.',
          traits: ['wise', 'ethical', 'traditional', 'measured'],
          imageUrl: '/images/characters/confucius.jpg'
        },
        {
          id: '7',
          name: 'Albert Einstein',
          category: 'Scientist',
          era: '20th Century',
          description: 'Theoretical physicist who developed the theory of relativity, one of the two pillars of modern physics.',
          traits: ['brilliant', 'imaginative', 'persistent', 'independent'],
          imageUrl: '/images/characters/einstein.jpg'
        },
        {
          id: '8',
          name: 'William Shakespeare',
          category: 'Writer',
          era: 'Elizabethan England',
          description: 'English poet, playwright, and actor, widely regarded as the greatest writer in the English language.',
          traits: ['creative', 'insightful', 'eloquent', 'dramatic'],
          imageUrl: '/images/characters/shakespeare.jpg'
        },
        {
          id: '9',
          name: 'Julius Caesar',
          category: 'Military Leader & Ruler',
          era: 'Ancient Rome',
          description: 'Roman general and statesman who played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.',
          traits: ['ambitious', 'strategic', 'eloquent', 'bold'],
          imageUrl: '/images/characters/caesar.jpg'
        },
        {
          id: '10',
          name: 'Joan of Arc',
          category: 'Military Leader',
          era: 'Medieval France',
          description: 'French peasant girl who claimed to have received visions from saints telling her to recover France from English domination.',
          traits: ['courageous', 'determined', 'faithful', 'inspiring'],
          imageUrl: '/images/characters/joan-of-arc.jpg'
        },
        {
          id: '11',
          name: 'Mahatma Gandhi',
          category: 'Political Leader',
          era: '20th Century',
          description: 'Indian independence leader who championed nonviolent resistance to achieve political and social progress.',
          traits: ['peaceful', 'determined', 'principled', 'inspiring'],
          imageUrl: '/images/characters/gandhi.jpg'
        },
        {
          id: '12',
          name: 'Plato',
          category: 'Philosopher',
          era: 'Ancient Greece',
          description: 'Greek philosopher and student of Socrates, founder of the Academy and teacher of Aristotle.',
          traits: ['idealistic', 'analytical', 'systematic', 'visionary'],
          imageUrl: '/images/characters/plato.jpg'
        },
        {
          id: '13',
          name: 'Aristotle',
          category: 'Philosopher',
          era: 'Ancient Greece',
          description: 'Greek philosopher and student of Plato, tutor to Alexander the Great, and founder of the Lyceum.',
          traits: ['logical', 'systematic', 'empirical', 'comprehensive'],
          imageUrl: '/images/characters/aristotle.jpg'
        },
        {
          id: '14',
          name: 'Alexander the Great',
          category: 'Military Leader & Ruler',
          era: 'Ancient Macedonia',
          description: 'Macedonian king who created one of the largest empires in ancient history, stretching from Greece to Egypt and India.',
          traits: ['ambitious', 'strategic', 'charismatic', 'bold'],
          imageUrl: '/images/characters/alexander.jpg'
        },
        {
          id: '15',
          name: 'Napoleon Bonaparte',
          category: 'Military Leader & Emperor',
          era: '18th-19th Century',
          description: 'French military general and emperor who conquered much of Europe in the early 19th century.',
          traits: ['strategic', 'ambitious', 'decisive', 'innovative'],
          imageUrl: '/images/characters/napoleon.jpg'
        }
      ];
    }
    // Return all characters from API
    return characters;
  }, [characters]);

  const handleStartConversation = (characterId: string) => {
    router.push(`/conversation?characters=${characterId}`);
  };

  return (
    <Grid container spacing={3}>
      {characterList.map((character) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={character.id}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)'
            }
          }}>
            <CardMedia
              component="img"
              height="200"
              image={character.imageUrl || '/images/placeholder.jpg'}
              alt={character.name}
              sx={{ objectFit: 'cover' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/placeholder.jpg';
              }}
            />
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography gutterBottom variant="h5" component="div">
                {character.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {character.era || 'Unknown era'} • {character.category || 'Uncategorized'}
              </Typography>
              <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                {character.description || 'No description available.'}
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {(character.traits || []).map((trait) => (
                  <Chip
                    key={trait}
                    label={trait}
                    size="small"
                    variant="outlined"
                    sx={{ marginBottom: 0.5 }}
                  />
                ))}
              </Box>
            </CardContent>
            <CardActions>
              <Button 
                size="small" 
                onClick={() => handleStartConversation(character.id)}
                variant="contained" 
                fullWidth
              >
                Converse
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default CharacterGrid;
