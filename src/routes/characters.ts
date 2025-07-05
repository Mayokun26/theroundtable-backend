import express from 'express';
import { dynamoDB, TableNames } from '../config/dynamodb';
import { ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';
import { getRedisClient, isRedisEnabled } from '../config/redis';

export const characterRoutes = express.Router();

// Get all characters
characterRoutes.get('/', async (req, res) => {
  try {
    // Try to get from Redis cache first
    const redisClient = getRedisClient();
    const cacheKey = 'characters:all';
    
    // Clear cache if force refresh is requested
    if (req.query.refresh === 'true' && redisClient) {
      await redisClient.del(cacheKey);
      logger.info('Character cache cleared due to refresh request');
    }
    
    if (isRedisEnabled() && redisClient) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        logger.info('Returning characters from cache');
        return res.status(200).json(JSON.parse(cachedData));
      }
    }
    
    // If not in cache or Redis is disabled, fetch from DynamoDB
    const command = new ScanCommand({
      TableName: TableNames.CHARACTERS,
      Limit: 100 // Increase limit to ensure we get all characters
    });
    
    try {
      const result = await dynamoDB.send(command);
      const characters = result.Items || [];
      
      logger.info(`Retrieved ${characters.length} characters from database`);
      
      if (characters.length === 0) {
        throw new Error('No characters found in database');
      }
      
      const response = {
        status: 'success',
        message: 'Characters retrieved successfully',
        data: characters
      };
      
      // Cache the result for future requests (5 minutes)
      if (isRedisEnabled() && redisClient) {
        await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 300);
      }
        return res.status(200).json(response);
    } catch (dbError) {
      logger.error('DynamoDB error:', dbError);
        // Enhanced fallback data with more characters
      logger.info('Falling back to mock character data');
      const mockCharacters = [
        { 
          id: '1',
          characterId: '1', // Adding both id formats for consistency
          name: 'Socrates',
          era: 'Ancient Greece',
          category: 'Philosopher',
          description: 'Classical Greek philosopher credited as one of the founders of Western philosophy.',
          traits: ['Wisdom', 'Ethics', 'Logic'],
          imageUrl: '/images/socrates.jpg'
        },        { 
          id: '2',
          characterId: '2', 
          name: 'Marie Curie',
          era: 'Modern Era',
          category: 'Scientist',
          description: 'Physicist and chemist who conducted pioneering research on radioactivity.',
          traits: ['Scientific', 'Dedicated', 'Pioneering'],
          imageUrl: '/images/marie-curie.jpg'
        },
        { 
          id: '3',
          characterId: '3', 
          name: 'Sun Tzu',
          era: 'Ancient China',
          category: 'Military Strategist',
          description: 'Chinese general, military strategist, writer, and philosopher known for "The Art of War".',
          traits: ['Strategic', 'Disciplined', 'Philosophical'],
          imageUrl: '/images/sun-tzu.jpg'
        },
        { 
          id: '4',
          characterId: '4', 
          name: 'Leonardo da Vinci',
          era: 'Renaissance',
          category: 'Polymath',
          description: 'Italian Renaissance polymath whose areas of interest included invention, painting, sculpture, architecture, science, and more.',
          traits: ['Creative', 'Innovative', 'Observant'],
          imageUrl: '/images/davinci.jpg'
        },
        { 
          id: '5', 
          name: 'William Shakespeare',
          era: 'Elizabethan Era',
          category: 'Playwright',
          description: 'English poet, playwright, and actor, widely regarded as the greatest writer in the English language.',
          traits: ['Poetic', 'Dramatic', 'Insightful'],
          imageUrl: '/images/shakespeare.jpg'
        },
        { 
          id: '6', 
          name: 'Ada Lovelace',
          era: 'Victorian Era',
          category: 'Mathematician',
          description: 'English mathematician and writer, known for her work on Charles Babbage\'s early mechanical computer.',
          traits: ['Analytical', 'Visionary', 'Pioneer'],
          imageUrl: '/images/lovelace.jpg'
        },        { 
          id: '7', 
          name: 'Nikola Tesla',
          era: 'Modern Era',
          category: 'Inventor',
          description: 'Serbian-American inventor, electrical engineer, and futurist who made contributions to the design of modern electricity supply systems.',
          traits: ['Innovative', 'Eccentric', 'Brilliant'],
          imageUrl: '/images/tesla.jpg'
        },
        { 
          id: '8', 
          name: 'Cleopatra',
          era: 'Ancient Egypt',
          category: 'Ruler',
          description: 'Last active ruler of the Ptolemaic Kingdom of Egypt, known for her intelligence, charm, and political acumen.',
          traits: ['Strategic', 'Charismatic', 'Multilingual'],
          imageUrl: '/images/cleopatra.jpg'
        },
        { 
          id: '9', 
          name: 'Albert Einstein',
          era: 'Modern Era',
          category: 'Physicist',
          description: 'Theoretical physicist who developed the theory of relativity, one of the pillars of modern physics.',
          traits: ['Genius', 'Curious', 'Imaginative'],
          imageUrl: '/images/einstein.jpg'
        },
        { 
          id: '10', 
          name: 'Jane Austen',
          era: 'Georgian Era',
          category: 'Novelist',
          description: 'English novelist known for her six major novels, which interpret, critique and comment upon the British landed gentry at the end of the 18th century.',
          traits: ['Observant', 'Witty', 'Insightful'],
          imageUrl: '/images/austen.jpg'
        },
        { 
          id: '11', 
          name: 'Mahatma Gandhi',
          era: 'Modern Era',
          category: 'Political Leader',
          description: 'Indian lawyer, anti-colonial nationalist and political ethicist who employed nonviolent resistance to lead India to independence.',
          traits: ['Peaceful', 'Principled', 'Determined'],
          imageUrl: '/images/gandhi.jpg'
        },
        { 
          id: '12', 
          name: 'Maya Angelou',
          era: 'Modern Era',
          category: 'Poet',
          description: 'American poet, memoirist, and civil rights activist best known for her autobiographical book "I Know Why the Caged Bird Sings."',
          traits: ['Resilient', 'Inspiring', 'Creative'],
          imageUrl: '/images/angelou.jpg'
        },
        { 
          id: '13', 
          name: 'Confucius',
          era: 'Ancient China',
          category: 'Philosopher',
          description: 'Chinese philosopher and politician considered the paragon of Chinese sages and a major influence on Eastern thought.',
          traits: ['Wise', 'Ethical', 'Scholarly'],
          imageUrl: '/images/confucius.jpg'
        },
        { 
          id: '14', 
          name: 'Frida Kahlo',
          era: 'Modern Era',
          category: 'Artist',
          description: 'Mexican painter known for her many portraits, self-portraits, and works inspired by nature and artifacts of Mexico.',
          traits: ['Passionate', 'Resilient', 'Expressive'],
          imageUrl: '/images/kahlo.jpg'
        }
      ];      // Generate additional characters to reach 50
      for (let i = 15; i <= 50; i++) {
        const eras = ['Ancient Greece', 'Roman Empire', 'Renaissance', 'Medieval Period', 'Industrial Revolution', 'Modern Era', 'Victorian Era', 'Enlightenment'];
        const categories = ['Philosopher', 'Scientist', 'Artist', 'Military Leader', 'Writer', 'Ruler', 'Inventor', 'Explorer'];
        const idStr = i.toString();
        
        mockCharacters.push({
          id: idStr,
          characterId: idStr, // Adding both id formats for consistency
          name: `Historical Figure ${i}`,
          era: eras[Math.floor(Math.random() * eras.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          description: `A notable historical figure known for their contributions to ${categories[Math.floor(Math.random() * categories.length)].toLowerCase()}.`,
          traits: ['Notable', 'Historical', 'Influential'],
          imageUrl: `/images/figure${i}.jpg`
        });
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'List of characters returned (mock data)',
        data: mockCharacters
      });
    }
  } catch (error) {
    logger.error('Error retrieving characters:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve characters'
    });
  }
});

// Get character by ID
characterRoutes.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Try to get from Redis cache first
    const redisClient = getRedisClient();
    const cacheKey = `characters:${id}`;
    
    if (isRedisEnabled() && redisClient) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        logger.info(`Returning character ${id} from cache`);
        return res.status(200).json(JSON.parse(cachedData));
      }
    }
    
    // If not in cache or Redis is disabled, fetch from DynamoDB
    const command = new GetCommand({
      TableName: TableNames.CHARACTERS,
      Key: { id }
    });
    
    try {
      const result = await dynamoDB.send(command);
      const character = result.Item;
      
      if (!character) {
        // Fallback to mock data if character not found in database
        const mockCharacter = {
          id,
          name: id === '1' ? 'Socrates' : id === '2' ? 'Marie Curie' : 'Sun Tzu',
          era: id === '1' ? 'Ancient Greece' : id === '2' ? 'Modern Era' : 'Ancient China',
          category: id === '1' ? 'Philosopher' : id === '2' ? 'Scientist' : 'Military Strategist',
          description: 'This is a mock description for the character.',
          traits: ['Trait 1', 'Trait 2', 'Trait 3'],
          imageUrl: `/images/${id}.jpg`
        };
        
        const response = {
          status: 'success',
          message: 'Character retrieved (mock data)',
          data: mockCharacter
        };
        
        return res.status(200).json(response);
      }
      
      const response = {
        status: 'success',
        message: 'Character retrieved successfully',
        data: character
      };
      
      // Cache the result for future requests (5 minutes)
      if (isRedisEnabled() && redisClient) {
        await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 300);
      }
      
      return res.status(200).json(response);
    } catch (dbError) {
      logger.error('DynamoDB error:', dbError);
      
      // Fallback to mock data if database is unavailable
      const mockCharacter = {
        id,
        name: id === '1' ? 'Socrates' : id === '2' ? 'Marie Curie' : 'Sun Tzu',
        era: id === '1' ? 'Ancient Greece' : id === '2' ? 'Modern Era' : 'Ancient China',
        category: id === '1' ? 'Philosopher' : id === '2' ? 'Scientist' : 'Military Strategist',
        description: 'This is a mock description for the character.',
        traits: ['Trait 1', 'Trait 2', 'Trait 3'],
        imageUrl: `/images/${id}.jpg`
      };
      
      return res.status(200).json({
        status: 'success',
        message: 'Character retrieved (mock data)',
        data: mockCharacter
      });
    }
  } catch (error) {
    logger.error(`Error retrieving character ${id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve character'
    });
  }
});
