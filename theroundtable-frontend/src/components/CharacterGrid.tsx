import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert
} from '@mui/material';

interface Character {
  id: string;
  name: string;
  category?: string;
  era?: string;
  description?: string;
  traits?: string[];
  imageUrl?: string;
  placeholderColor?: string;
}

interface CharacterGridProps {
  characters: Character[];
  selectedCharacters?: string[];
  onCharacterSelect?: (characterId: string) => void;
  maxSelection?: number;
  showSearch?: boolean;
}

// Function to get character-specific border color
const getCharacterBorderColor = (characterName: string): string => {
  switch (characterName.toLowerCase()) {
    // Ancient Philosophers & Thinkers
    case 'socrates': return '#ce93d8'; // Purple
    case 'plato': return '#9575cd'; // Deep purple  
    case 'aristotle': return '#4db6ac'; // Teal
    case 'confucius': return '#ffb74d'; // Orange
    case 'lao tzu': return '#aed581'; // Light green
    case 'pythagoras': return '#42a5f5'; // Sky blue
    case 'marcus aurelius': return '#f06292'; // Rose
    case 'hypatia': return '#ba68c8'; // Lavender
    
    // Scientists & Innovators
    case 'marie curie': return '#bbdefb'; // Blue
    case 'albert einstein': return '#fff176'; // Yellow
    case 'nikola tesla': return '#66bb6a'; // Electric green
    case 'galileo galilei': return '#4fc3f7'; // Cyan
    case 'isaac newton': return '#dce775'; // Lime
    case 'charles darwin': return '#81c784'; // Nature green
    case 'ada lovelace': return '#f48fb1'; // Pink
    case 'grace hopper': return '#26a69a'; // Mint
    case 'alan turing': return '#7986cb'; // Purple
    case 'ibn sina (avicenna)': return '#ff9800'; // Amber
    case 'ibn al-haytham': return '#2196f3'; // Blue
    case 'leonardo fibonacci': return '#66bb6a'; // Green
    case 'rachel carson': return '#4caf50'; // Forest green
    
    // Military Leaders & Rulers
    case 'sun tzu': return '#d7ccc8'; // Tan
    case 'julius caesar': return '#f44336'; // Roman red
    case 'alexander the great': return '#ff9800'; // Gold
    case 'napoleon bonaparte': return '#3f51b5'; // Imperial blue
    case 'joan of arc': return '#9c27b0'; // Royal purple
    case 'cleopatra': return '#ffe082'; // Egyptian gold
    case 'catherine the great': return '#5c6bc0'; // Russian blue
    case 'queen elizabeth i': return '#ffc107'; // Tudor gold
    case 'mahatma gandhi': return '#ff9800'; // Saffron
    case 'nelson mandela': return '#388e3c'; // Hope green
    
    // Artists & Writers
    case 'leonardo da vinci': return '#ff9800'; // Renaissance gold
    case 'william shakespeare': return '#8e24aa'; // Theatrical purple
    case 'michelangelo': return '#e91e63'; // Marble pink
    case 'pablo picasso': return '#03a9f4'; // Cubist blue
    case 'frida kahlo': return '#f44336'; // Passionate red
    case 'georgia o\'keeffe': return '#ff9800'; // Desert orange
    case 'jane austen': return '#8bc34a'; // English green
    case 'virginia woolf': return '#673ab7'; // Literary purple
    case 'emily dickinson': return '#cddc39'; // Recluse yellow
    case 'mary shelley': return '#009688'; // Gothic teal
    case 'maya angelou': return '#ff7043'; // Warm orange
    case 'anne frank': return '#66bb6a'; // Hope green
    case 'frederick douglass': return '#3f51b5'; // Freedom blue
    
    // Musicians & Performers  
    case 'wolfgang amadeus mozart': return '#ffc107'; // Musical gold
    case 'martha graham': return '#e91e63'; // Dance pink
    
    // Activists & Social Reformers
    case 'florence nightingale': return '#f48fb1'; // Caring pink
    case 'rosa parks': return '#7986cb'; // Dignity purple
    case 'malcolm x': return '#f44336'; // Passionate red
    case 'mary seacole': return '#ff9800'; // Caribbean gold
    
    default:
      return '#1976d2'; // Default blue
  }
};

const CharacterPlaceholder: React.FC<{ character: Character }> = ({ character }) => {
  const initials = character.name.split(' ').map(word => word[0]).join('').toUpperCase();
  
  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 150, sm: 180, md: 200 },
        backgroundColor: character.placeholderColor || '#95a5a6',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <Typography 
        variant="h3" 
        component="div" 
        sx={{ 
          fontWeight: 'bold', 
          mb: 1,
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
        }}
      >
        {initials}
      </Typography>
      <Typography 
        variant="body2" 
        component="div" 
        sx={{ 
          textAlign: 'center', 
          px: 1,
          fontSize: { xs: '0.8rem', sm: '0.875rem' }
        }}
      >
        {character.name}
      </Typography>
    </Box>
  );
};

const CharacterGrid: React.FC<CharacterGridProps> = ({ 
  characters = [], 
  selectedCharacters = [], 
  onCharacterSelect,
  maxSelection = 3,
  showSearch = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [eraFilter, setEraFilter] = useState<string>('');
  
  const characterList = useMemo(() => {
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
        },
        {
          id: '4',
          name: 'Leonardo da Vinci',
          category: 'Polymath',
          era: 'Renaissance',
          description: 'Italian Renaissance polymath whose areas of interest included invention, drawing, painting, sculpture, architecture, science, music, mathematics, engineering, literature, anatomy, geology, astronomy, botany, paleontology, and cartography.',
          traits: ['creative', 'innovative', 'analytical', 'curious'],
          imageUrl: '/images/characters/leonardo.svg',
          placeholderColor: '#9b59b6'
        },
        {
          id: '5',
          name: 'Cleopatra',
          category: 'Ruler',
          era: 'Ancient Egypt',
          description: 'Last active ruler of the Ptolemaic Kingdom of Egypt, known for her intelligence, political acumen, and romantic relationships with Julius Caesar and Mark Antony.',
          traits: ['strategic', 'charismatic', 'diplomatic', 'ambitious'],
          imageUrl: '/images/characters/cleopatra.svg',
          placeholderColor: '#1abc9c'
        },
        {
          id: '6',
          name: 'Confucius',
          category: 'Philosopher',
          era: 'Ancient China',
          description: 'Chinese philosopher and politician who is widely considered one of the most important and influential individuals in human history.',
          traits: ['wise', 'ethical', 'traditional', 'measured'],
          imageUrl: '/images/characters/confucius.svg',
          placeholderColor: '#34495e'
        },
        {
          id: '7',
          name: 'Albert Einstein',
          category: 'Scientist',
          era: '20th Century',
          description: 'Theoretical physicist who developed the theory of relativity, one of the two pillars of modern physics.',
          traits: ['brilliant', 'imaginative', 'persistent', 'independent'],
          imageUrl: '/images/characters/einstein.svg',
          placeholderColor: '#2ecc71'
        },
        {
          id: '8',
          name: 'William Shakespeare',
          category: 'Writer',
          era: 'Elizabethan England',
          description: 'English poet, playwright, and actor, widely regarded as the greatest writer in the English language.',
          traits: ['creative', 'insightful', 'eloquent', 'dramatic'],
          imageUrl: '/images/characters/shakespeare.svg',
          placeholderColor: '#8e44ad'
        },
        {
          id: '9',
          name: 'Julius Caesar',
          category: 'Military Leader & Ruler',
          era: 'Ancient Rome',
          description: 'Roman general and statesman who played a critical role in the events that led to the demise of the Roman Republic and the rise of the Roman Empire.',
          traits: ['ambitious', 'strategic', 'eloquent', 'bold'],
          imageUrl: '/images/characters/caesar.svg',
          placeholderColor: '#c0392b'
        },
        {
          id: '10',
          name: 'Joan of Arc',
          category: 'Military Leader',
          era: 'Medieval France',
          description: 'French peasant girl who claimed to have received visions from saints telling her to recover France from English domination.',
          traits: ['courageous', 'determined', 'faithful', 'inspiring'],
          imageUrl: '/images/characters/joan-of-arc.svg',
          placeholderColor: '#16a085'
        },
        {
          id: '11',
          name: 'Mahatma Gandhi',
          category: 'Political Leader',
          era: '20th Century',
          description: 'Indian independence leader who championed nonviolent resistance to achieve political and social progress.',
          traits: ['peaceful', 'determined', 'principled', 'inspiring'],
          imageUrl: '/images/characters/gandhi.svg',
          placeholderColor: '#f1c40f'
        },
        {
          id: '12',
          name: 'Plato',
          category: 'Philosopher',
          era: 'Ancient Greece',
          description: 'Greek philosopher and student of Socrates, founder of the Academy and teacher of Aristotle.',
          traits: ['idealistic', 'analytical', 'systematic', 'visionary'],
          imageUrl: '/images/characters/plato.svg',
          placeholderColor: '#27ae60'
        },
        {
          id: '13',
          name: 'Aristotle',
          category: 'Philosopher',
          era: 'Ancient Greece',
          description: 'Greek philosopher and student of Plato, tutor to Alexander the Great, and founder of the Lyceum.',
          traits: ['logical', 'systematic', 'empirical', 'comprehensive'],
          imageUrl: '/images/characters/aristotle.svg',
          placeholderColor: '#2980b9'
        },
        {
          id: '14',
          name: 'Alexander the Great',
          category: 'Military Leader & Ruler',
          era: 'Ancient Macedonia',
          description: 'Macedonian king who created one of the largest empires in ancient history, stretching from Greece to Egypt and India.',
          traits: ['ambitious', 'strategic', 'charismatic', 'bold'],
          imageUrl: '/images/characters/alexander.svg',
          placeholderColor: '#d35400'
        },
        {
          id: '15',
          name: 'Napoleon Bonaparte',
          category: 'Military Leader & Emperor',
          era: '18th-19th Century',
          description: 'French military general and emperor who conquered much of Europe in the early 19th century.',
          traits: ['strategic', 'ambitious', 'decisive', 'innovative'],
          imageUrl: '/images/characters/napoleon.svg',
          placeholderColor: '#7f8c8d'
        },
        {
          id: '16',
          name: 'Marcus Aurelius',
          category: 'Philosopher & Emperor',
          era: 'Ancient Rome',
          description: 'Roman emperor and Stoic philosopher who wrote "Meditations" and ruled during the height of the Roman Empire.',
          traits: ['philosophical', 'stoic', 'virtuous', 'disciplined'],
          imageUrl: '/images/characters/marcus-aurelius.svg',
          placeholderColor: '#8b4513'
        },
        {
          id: '17',
          name: 'Frederick the Great',
          category: 'Military Leader & King',
          era: '18th Century',
          description: 'King of Prussia who was a military genius, patron of the arts, and enlightened despot.',
          traits: ['strategic', 'cultured', 'enlightened', 'decisive'],
          imageUrl: '/images/characters/frederick.svg',
          placeholderColor: '#4682b4'
        },
        {
          id: '18',
          name: 'Catherine the Great',
          category: 'Empress',
          era: '18th Century',
          description: 'Empress of Russia who expanded territory, promoted arts and education, and corresponded with Enlightenment philosophers.',
          traits: ['intelligent', 'cultured', 'reformist', 'ambitious'],
          imageUrl: '/images/characters/catherine.svg',
          placeholderColor: '#9932cc'
        },
        {
          id: '19',
          name: 'Hannibal Barca',
          category: 'Military Leader',
          era: 'Ancient Carthage',
          description: 'Carthaginian general who crossed the Alps with elephants to attack Rome during the Second Punic War.',
          traits: ['tactical', 'innovative', 'persistent', 'bold'],
          imageUrl: '/images/characters/hannibal.svg',
          placeholderColor: '#b22222'
        },
        {
          id: '20',
          name: 'Saladin',
          category: 'Military Leader & Sultan',
          era: 'Medieval Islamic World',
          description: 'Kurdish Muslim leader who recaptured Jerusalem from the Crusaders and was known for his chivalrous conduct.',
          traits: ['honorable', 'strategic', 'diplomatic', 'devout'],
          imageUrl: '/images/characters/saladin.svg',
          placeholderColor: '#228b22'
        },
        {
          id: '21',
          name: 'Elizabeth I',
          category: 'Queen',
          era: 'Tudor England',
          description: 'Queen of England who defeated the Spanish Armada and presided over the Elizabethan Golden Age.',
          traits: ['intelligent', 'determined', 'eloquent', 'independent'],
          imageUrl: '/images/characters/elizabeth.svg',
          placeholderColor: '#dc143c'
        },
        {
          id: '22',
          name: 'King Arthur',
          category: 'Legendary King',
          era: 'Medieval Britain',
          description: 'Legendary British leader who established the Round Table and sought the Holy Grail.',
          traits: ['noble', 'chivalrous', 'just', 'inspirational'],
          imageUrl: '/images/characters/arthur.svg',
          placeholderColor: '#ffd700'
        },
        {
          id: '23',
          name: 'Lao Tzu',
          category: 'Philosopher',
          era: 'Ancient China',
          description: 'Ancient Chinese philosopher and founder of Taoism who wrote the Tao Te Ching.',
          traits: ['wise', 'peaceful', 'philosophical', 'simple'],
          imageUrl: '/images/characters/laotzu.svg',
          placeholderColor: '#8fbc8f'
        },
        {
          id: '24',
          name: 'Miyamoto Musashi',
          category: 'Samurai & Philosopher',
          era: 'Feudal Japan',
          description: 'Legendary Japanese swordsman who developed the two-sword fighting style and wrote "The Book of Five Rings".',
          traits: ['disciplined', 'philosophical', 'skilled', 'strategic'],
          imageUrl: '/images/characters/musashi.svg',
          placeholderColor: '#2f4f4f'
        },
        {
          id: '25',
          name: 'Charlemagne',
          category: 'Emperor',
          era: 'Early Medieval Europe',
          description: 'King of the Franks and Emperor of the Romans who united much of Western Europe.',
          traits: ['unifying', 'religious', 'educational', 'powerful'],
          imageUrl: '/images/characters/charlemagne.svg',
          placeholderColor: '#4169e1'
        },
        {
          id: '26',
          name: 'Genghis Khan',
          category: 'Military Leader & Emperor',
          era: 'Medieval Mongolia',
          description: 'Founder of the Mongol Empire, the largest contiguous land empire in history.',
          traits: ['ruthless', 'strategic', 'unifying', 'adaptive'],
          imageUrl: '/images/characters/genghis.svg',
          placeholderColor: '#8b4513'
        },
        {
          id: '27',
          name: 'Akbar the Great',
          category: 'Emperor',
          era: 'Mughal India',
          description: 'Mughal Emperor who created a diverse, tolerant empire and promoted religious harmony.',
          traits: ['tolerant', 'wise', 'administrative', 'cultured'],
          imageUrl: '/images/characters/akbar.svg',
          placeholderColor: '#daa520'
        },
        {
          id: '28',
          name: 'Ramesses II',
          category: 'Pharaoh',
          era: 'Ancient Egypt',
          description: 'Known as Ramesses the Great, he built numerous monuments and presided over Egypt\'s golden age.',
          traits: ['mighty', 'builder', 'divine', 'enduring'],
          imageUrl: '/images/characters/ramesses.svg',
          placeholderColor: '#cd853f'
        },
        {
          id: '29',
          name: 'Cyrus the Great',
          category: 'Emperor',
          era: 'Ancient Persia',
          description: 'Founder of the Persian Empire who created the first charter of human rights.',
          traits: ['tolerant', 'just', 'administrative', 'expansive'],
          imageUrl: '/images/characters/cyrus.svg',
          placeholderColor: '#483d8b'
        },
        {
          id: '30',
          name: 'Ashoka the Great',
          category: 'Emperor',
          era: 'Ancient India',
          description: 'Mauryan Emperor who embraced Buddhism and promoted non-violence after the Kalinga War.',
          traits: ['compassionate', 'reformed', 'spiritual', 'peaceful'],
          imageUrl: '/images/characters/ashoka.svg',
          placeholderColor: '#ff6347'
        },
        {
          id: '31',
          name: 'Hammurabi',
          category: 'King & Lawgiver',
          era: 'Ancient Babylon',
          description: 'King of Babylon who created one of the world\'s first written legal codes.',
          traits: ['lawgiving', 'just', 'systematic', 'authoritative'],
          imageUrl: '/images/characters/hammurabi.svg',
          placeholderColor: '#696969'
        },
        {
          id: '32',
          name: 'Pericles',
          category: 'Statesman',
          era: 'Ancient Greece',
          description: 'Athenian statesman who led Athens during its Golden Age and promoted democracy.',
          traits: ['democratic', 'cultural', 'eloquent', 'visionary'],
          imageUrl: '/images/characters/pericles.svg',
          placeholderColor: '#1e90ff'
        },
        {
          id: '33',
          name: 'Justinian I',
          category: 'Emperor',
          era: 'Byzantine Empire',
          description: 'Byzantine Emperor who created the Justinian Code and attempted to reconquer the Western Roman Empire.',
          traits: ['legal', 'ambitious', 'religious', 'systematic'],
          imageUrl: '/images/characters/justinian.svg',
          placeholderColor: '#8a2be2'
        },
        {
          id: '34',
          name: 'Harun al-Rashid',
          category: 'Caliph',
          era: 'Islamic Golden Age',
          description: 'Abbasid Caliph who ruled during the Islamic Golden Age and promoted learning and culture.',
          traits: ['cultured', 'learned', 'generous', 'wise'],
          imageUrl: '/images/characters/harun.svg',
          placeholderColor: '#20b2aa'
        },
        {
          id: '35',
          name: 'Suleiman the Magnificent',
          category: 'Sultan',
          era: 'Ottoman Empire',
          description: 'Ottoman Sultan who expanded the empire to its greatest extent and was known for legal reforms.',
          traits: ['magnificent', 'legal', 'military', 'cultured'],
          imageUrl: '/images/characters/suleiman.svg',
          placeholderColor: '#dc143c'
        },
        {
          id: '36',
          name: 'Nebuchadnezzar II',
          category: 'King',
          era: 'Neo-Babylonian Empire',
          description: 'King of Babylon who built the Hanging Gardens and made Babylon the greatest city in the world.',
          traits: ['builder', 'magnificent', 'powerful', 'ambitious'],
          imageUrl: '/images/characters/nebuchadnezzar.svg',
          placeholderColor: '#b8860b'
        },
        {
          id: '37',
          name: 'Kublai Khan',
          category: 'Emperor',
          era: 'Yuan Dynasty China',
          description: 'Grandson of Genghis Khan who founded the Yuan Dynasty in China and patronized arts.',
          traits: ['cultured', 'adaptive', 'powerful', 'sophisticated'],
          imageUrl: '/images/characters/kublai.svg',
          placeholderColor: '#ff4500'
        },
        {
          id: '38',
          name: 'Darius the Great',
          category: 'Emperor',
          era: 'Ancient Persia',
          description: 'Persian Emperor who organized the empire into satrapies and built the Royal Road.',
          traits: ['administrative', 'organized', 'efficient', 'expansive'],
          imageUrl: '/images/characters/darius.svg',
          placeholderColor: '#4b0082'
        },
        {
          id: '39',
          name: 'Attila the Hun',
          category: 'Military Leader',
          era: 'Late Roman Empire',
          description: 'Known as the "Scourge of God" who terrorized both Western and Eastern Roman Empires.',
          traits: ['fearsome', 'strategic', 'nomadic', 'ruthless'],
          imageUrl: '/images/characters/attila.svg',
          placeholderColor: '#8b0000'
        },
        {
          id: '40',
          name: 'Shaka Zulu',
          category: 'Military Leader & King',
          era: '19th Century Africa',
          description: 'Zulu king who revolutionized African military tactics and created a powerful warrior state.',
          traits: ['innovative', 'warrior', 'tactical', 'transformative'],
          imageUrl: '/images/characters/shaka.svg',
          placeholderColor: '#228b22'
        },
        {
          id: '41',
          name: 'Tamerlane',
          category: 'Military Leader & Emperor',
          era: 'Medieval Central Asia',
          description: 'Turco-Mongol conqueror who built a vast empire and styled himself as heir to Genghis Khan.',
          traits: ['conquering', 'ruthless', 'architectural', 'ambitious'],
          imageUrl: '/images/characters/tamerlane.svg',
          placeholderColor: '#8b4513'
        },
        {
          id: '42',
          name: 'Xerxes I',
          category: 'Emperor',
          era: 'Ancient Persia',
          description: 'Persian Emperor who led the massive invasion of Greece and ruled the largest empire yet seen.',
          traits: ['imperial', 'ambitious', 'grandiose', 'powerful'],
          imageUrl: '/images/characters/xerxes.svg',
          placeholderColor: '#9932cc'
        },
        {
          id: '43',
          name: 'Mansa Musa',
          category: 'Emperor',
          era: 'Medieval Africa',
          description: 'Emperor of Mali whose pilgrimage to Mecca distributed so much gold it affected Mediterranean economies.',
          traits: ['wealthy', 'devout', 'generous', 'influential'],
          imageUrl: '/images/characters/mansa.svg',
          placeholderColor: '#ffd700'
        },
        {
          id: '44',
          name: 'Tokugawa Ieyasu',
          category: 'Shogun',
          era: 'Feudal Japan',
          description: 'Founder of the Tokugawa shogunate who unified Japan and established lasting peace.',
          traits: ['patient', 'strategic', 'unifying', 'diplomatic'],
          imageUrl: '/images/characters/tokugawa.svg',
          placeholderColor: '#2f4f4f'
        },
        {
          id: '45',
          name: 'Montezuma II',
          category: 'Emperor',
          era: 'Aztec Empire',
          description: 'Aztec Emperor who ruled at the empire\'s height and was known for elaborate court rituals.',
          traits: ['ritualistic', 'imperial', 'religious', 'sophisticated'],
          imageUrl: '/images/characters/montezuma.svg',
          placeholderColor: '#d2691e'
        },
        {
          id: '46',
          name: 'Pachacuti',
          category: 'Emperor',
          era: 'Inca Empire',
          description: 'Inca Emperor who transformed Cusco into the Inca Empire and built Machu Picchu.',
          traits: ['transformative', 'architectural', 'organizing', 'visionary'],
          imageUrl: '/images/characters/pachacuti.svg',
          placeholderColor: '#cd853f'
        },
        {
          id: '47',
          name: 'Hatshepsut',
          category: 'Pharaoh',
          era: 'Ancient Egypt',
          description: 'Female pharaoh who ruled successfully for 22 years and built magnificent monuments.',
          traits: ['pioneering', 'architectural', 'diplomatic', 'strong'],
          imageUrl: '/images/characters/hatshepsut.svg',
          placeholderColor: '#da70d6'
        },
        {
          id: '48',
          name: 'Sitting Bull',
          category: 'Chief',
          era: '19th Century America',
          description: 'Lakota leader who led resistance against U.S. policies and played a key role at Little Bighorn.',
          traits: ['spiritual', 'resistant', 'protective', 'wise'],
          imageUrl: '/images/characters/sitting-bull.svg',
          placeholderColor: '#8b4513'
        },
        {
          id: '49',
          name: 'Simón Bolívar',
          category: 'Revolutionary Leader',
          era: '19th Century South America',
          description: 'Known as El Libertador, he liberated much of South America from Spanish rule.',
          traits: ['liberating', 'visionary', 'passionate', 'unifying'],
          imageUrl: '/images/characters/bolivar.svg',
          placeholderColor: '#ff6347'
        },
        {
          id: '50',
          name: 'Nefertiti',
          category: 'Queen',
          era: 'Ancient Egypt',
          description: 'Queen of Egypt known for her beauty and powerful influence during religious reforms.',
          traits: ['beautiful', 'influential', 'religious', 'powerful'],
          imageUrl: '/images/characters/nefertiti.svg',
          placeholderColor: '#dda0dd'
        }
      ];
    }
    // Return all characters from API
    return characters;
  }, [characters]);

  // Extract unique categories and eras for filtering
  const categories = useMemo(() => {
    const allCategories = characterList.map(char => char.category).filter(Boolean) as string[];
    return Array.from(new Set(allCategories)).sort();
  }, [characterList]);

  const eras = useMemo(() => {
    const allEras = characterList.map(char => char.era).filter(Boolean) as string[];
    return Array.from(new Set(allEras)).sort();
  }, [characterList]);

  // Filter characters based on search and filters
  const filteredCharacters = useMemo(() => {
    let filtered = characterList;

    // Search term filtering
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(char => 
        char.name.toLowerCase().includes(searchLower) ||
        char.category?.toLowerCase().includes(searchLower) ||
        char.era?.toLowerCase().includes(searchLower) ||
        char.description?.toLowerCase().includes(searchLower) ||
        char.traits?.some(trait => trait.toLowerCase().includes(searchLower))
      );
    }

    // Category filtering
    if (categoryFilter) {
      filtered = filtered.filter(char => char.category === categoryFilter);
    }

    // Era filtering
    if (eraFilter) {
      filtered = filtered.filter(char => char.era === eraFilter);
    }

    return filtered;
  }, [characterList, searchTerm, categoryFilter, eraFilter]);

  const handleCharacterClick = (characterId: string) => {
    if (!onCharacterSelect) return;

    if (selectedCharacters.includes(characterId)) {
      // Deselect character
      onCharacterSelect(characterId);
    } else if (selectedCharacters.length < maxSelection) {
      // Select character if under limit
      onCharacterSelect(characterId);
    }
  };

  const isSelectionLimitReached = selectedCharacters.length >= maxSelection;

  return (
    <Stack spacing={3}>
      {/* Search and Filter Controls */}
      {showSearch && (
        <Stack spacing={{ xs: 3, sm: 2 }}>
        <TextField
          fullWidth
          label="Search characters"
          placeholder="Search by name, category, era, or traits..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '1rem', sm: '1rem' },
              '& input': {
                padding: { xs: '14px 16px', sm: '12px 14px' }
              }
            }
          }}
        />
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 2 }}>
          <FormControl sx={{ minWidth: { xs: '100%', sm: 180, md: 200 } }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
              sx={{
                '& .MuiSelect-select': {
                  padding: { xs: '14px 16px', sm: '12px 14px' },
                  fontSize: { xs: '1rem', sm: '0.95rem' }
                }
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: { xs: '100%', sm: 160, md: 200 } }}>
            <InputLabel>Era</InputLabel>
            <Select
              value={eraFilter}
              label="Era"
              onChange={(e) => setEraFilter(e.target.value)}
              sx={{
                '& .MuiSelect-select': {
                  padding: { xs: '14px 16px', sm: '12px 14px' },
                  fontSize: { xs: '1rem', sm: '0.95rem' }
                }
              }}
            >
              <MenuItem value="">All Eras</MenuItem>
              {eras.map(era => (
                <MenuItem key={era} value={era}>{era}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
      )}

      {/* Selection Status */}
      {onCharacterSelect && (
        <Alert severity={isSelectionLimitReached ? "warning" : "info"}>
          {selectedCharacters.length} of {maxSelection} panelists selected
          {isSelectionLimitReached && " (Maximum reached)"}
        </Alert>
      )}

      {/* Character Grid */}
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {filteredCharacters.map((character) => {
          const isSelected = selectedCharacters.includes(character.id);
          const canSelect = !isSelected && !isSelectionLimitReached;
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={4} key={character.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  cursor: onCharacterSelect ? 'pointer' : 'default',
                  opacity: (!onCharacterSelect || canSelect || isSelected) ? 1 : 0.5,
                  border: isSelected ? `3px solid ${getCharacterBorderColor(character.name)}` : '1px solid rgba(0, 0, 0, 0.12)',
                  minHeight: { xs: '280px', sm: '300px' },
                  '&:hover': {
                    transform: (onCharacterSelect && (canSelect || isSelected)) ? 'translateY(-3px)' : 'none',
                    boxShadow: (onCharacterSelect && (canSelect || isSelected)) ? '0 8px 16px rgba(0, 0, 0, 0.12)' : 'none'
                  },
                  '&:active': {
                    transform: (onCharacterSelect && (canSelect || isSelected)) ? 'translateY(-1px)' : 'none'
                  }
                }}
                onClick={() => handleCharacterClick(character.id)}
              >
                <CharacterPlaceholder character={character} />
                <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2 } }}>
                  <Typography gutterBottom variant="h5" component="div" sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.25rem' }, 
                    fontWeight: 'bold',
                    mb: { xs: 1, sm: 1.5 }
                  }}>
                    {character.name}
                    {isSelected && " ✓"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{
                    fontSize: { xs: '0.85rem', sm: '0.875rem' },
                    mb: { xs: 1, sm: 1.5 }
                  }}>
                    {character.era || 'Unknown era'} • {character.category || 'Uncategorized'}
                  </Typography>
                  <Typography variant="body2" paragraph sx={{ 
                    mb: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.9rem', sm: '0.875rem' },
                    lineHeight: { xs: 1.4, sm: 1.43 }
                  }}>
                    {character.description || 'No description available.'}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {(character.traits || []).map((trait) => (
                      <Chip
                        key={trait}
                        label={trait}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          marginBottom: 0.5,
                          fontSize: { xs: '0.75rem', sm: '0.75rem' },
                          height: { xs: '24px', sm: '24px' }
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* No Results Message */}
      {filteredCharacters.length === 0 && (
        <Alert severity="info">
          No characters found matching your search criteria. Try adjusting your filters.
        </Alert>
      )}
    </Stack>
  );
};

export default CharacterGrid;
