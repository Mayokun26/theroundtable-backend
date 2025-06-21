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
      
      return res.status(200).json(response);    } catch (dbError) {
      logger.error('DynamoDB error:', dbError);
      
      // Enhanced fallback data with more characters
      logger.info('Falling back to mock character data');
      const mockCharacters = [
        { 
          id: '1', 
          name: 'Socrates',
          era: 'Ancient Greece',
          category: 'Philosopher',
          description: 'Classical Greek philosopher credited as one of the founders of Western philosophy.',
          traits: ['Wisdom', 'Ethics', 'Logic'],
          imageUrl: '/images/socrates.jpg'
        },
        { 
          id: '2', 
          name: 'Marie Curie',
          era: 'Modern Era',
          category: 'Scientist',
          description: 'Physicist and chemist who conducted pioneering research on radioactivity.',
          traits: ['Scientific', 'Dedicated', 'Pioneering'],
          imageUrl: '/images/marie-curie.jpg'
        },
        { 
          id: '3', 
          name: 'Sun Tzu',
          era: 'Ancient China',
          category: 'Military Strategist',
          description: 'Chinese general, military strategist, writer, and philosopher known for "The Art of War".',
          traits: ['Strategic', 'Disciplined', 'Philosophical'],
          imageUrl: '/images/sun-tzu.jpg'
        },
        { 
          id: '4', 
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
        },
        { 
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
          imageUrl: '/images/socrates.jpg'
        },
        { 
          id: '2', 
          name: 'Marie Curie',
          era: 'Modern Era',
          category: 'Scientist',
          description: 'Physicist and chemist who conducted pioneering research on radioactivity.',
          traits: ['Scientific', 'Dedicated', 'Pioneering'],
          imageUrl: '/images/marie-curie.jpg' 
        },
        { 
          id: '3', 
          name: 'Sun Tzu',
          era: 'Ancient China',
          category: 'Military Strategist',
          description: 'Chinese general, military strategist, writer, and philosopher known for "The Art of War".',
          traits: ['Strategic', 'Disciplined', 'Philosophical'],
          imageUrl: '/images/sun-tzu.jpg'
        },
        { 
          id: '4', 
          name: 'Leonardo da Vinci',
          era: 'Renaissance',
          category: 'Polymath',
          description: 'Italian polymath of the Renaissance who is known for his works in art, science, and engineering.',
          traits: ['Creative', 'Inventive', 'Curious'],
          imageUrl: '/images/leonardo-da-vinci.jpg'
        },
        { 
          id: '5', 
          name: 'Cleopatra',
          era: 'Ancient Egypt',
          category: 'Queen',
          description: 'The last active ruler of the Ptolemaic Kingdom of Egypt, known for her intelligence and political acumen.',
          traits: ['Intelligent', 'Political', 'Charismatic'],
          imageUrl: '/images/cleopatra.jpg'
        },
        { 
          id: '6', 
          name: 'Genghis Khan',
          era: 'Mongol Empire',
          category: 'Emperor',
          description: 'Founder of the Mongol Empire, which became the largest contiguous empire in history after his death.',
          traits: ['Brave', 'Strategic', 'Ruthless'],
          imageUrl: '/images/genghis-khan.jpg'
        }
      ];
      
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
