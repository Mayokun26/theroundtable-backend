import express from 'express';
import { dynamoDB, TableNames } from '../config/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { getRedisClient, isRedisEnabled } from '../config/redis';

export const conversationRoutes = express.Router();

// Initialize OpenAI client with proper error handling
let openai: OpenAI;
try {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'fallback-key' || 
      process.env.OPENAI_API_KEY.includes('your-openai') || 
      process.env.OPENAI_API_KEY.includes('test_your_openai_key')) {
    logger.error('Missing or invalid OPENAI_API_KEY environment variable');
    throw new Error('OpenAI API key is not properly configured');
  }
  
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  logger.info('OpenAI client initialized successfully');
} catch (error) {
  logger.error('Failed to initialize OpenAI client:', error);  // Initialize with correct key to prevent app crash, but functionality may still be limited
  openai = new OpenAI({
    apiKey: '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'
  });
}

// Define types for character data
interface CharacterDetail {
  characterId?: string;
  id?: string;
  name: string;
  era?: string;
  traits?: string[];
  background?: string;
}

// Create a new conversation or add a message
conversationRoutes.post('/', async (req, res) => {
  const { message, characters } = req.body;
  
  logger.info(`Received conversation request with message: "${message?.substring(0, 20)}${message?.length > 20 ? '...' : ''}" and ${characters?.length || 0} characters`);
  
  if (!message || !characters || !Array.isArray(characters)) {
    logger.warn('Invalid request received:', { message: !!message, characters: !!characters, isArray: Array.isArray(characters) });
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request. Please provide a message and an array of character IDs.'
    });  }
  try {
    // Generate a conversation ID if this is a new conversation
    const conversationId = req.body.conversationId || uuidv4();
    logger.info(`Processing conversation ID: ${conversationId}`);

    // Helper function to generate default character details
    function getDefaultCharacterById(id: string): CharacterDetail {
      const defaultCharacters: Record<string, CharacterDetail> = {
        '1': { 
          id: '1', 
          name: 'Socrates',
          era: 'Ancient Greece',
          traits: ['philosophical', 'questioning'],
          background: 'Classical Greek philosopher credited as one of the founders of Western philosophy.'
        },
        '2': { 
          id: '2', 
          name: 'Marie Curie',
          era: 'Modern Era',
          traits: ['scientific', 'determined'],
          background: 'Physicist and chemist who conducted pioneering research on radioactivity.'
        },
        '3': { 
          id: '3', 
          name: 'Sun Tzu',
          era: 'Ancient China',
          traits: ['strategic', 'wise'],
          background: 'Chinese general, military strategist, writer, and philosopher known for "The Art of War".'
        },
        '4': { 
          id: '4', 
          name: 'Leonardo da Vinci',
          era: 'Renaissance',
          traits: ['creative', 'inventive'],
          background: 'Italian polymath of the Renaissance whose areas of interest included invention, drawing, painting, and sculpture.'
        },
        '5': { 
          id: '5', 
          name: 'William Shakespeare',
          era: 'Elizabethan Era',
          traits: ['poetic', 'dramatic'],
          background: 'English playwright, poet, and actor, widely regarded as the greatest writer in the English language.'
        }
      };
      
      return defaultCharacters[id] || { 
        id, 
        name: `Character ${id}`,
        traits: ['generic'],
        era: 'Unknown',
        background: 'A historical figure'
      };
    }// Helper function to generate character-specific responses using OpenAI
async function generateCharacterResponse(userMessage: string, character: CharacterDetail): Promise<string> {
  try {
    // Build a prompt that captures the character's persona
    const characterInfo = character.background ? 
      `${character.name} (${character.era || 'Unknown Era'}) who ${character.background}` : 
      `${character.name} from ${character.era || 'Unknown Era'}`;
    
    const traits = character.traits && character.traits.length > 0 ? 
      `Known for being ${character.traits.join(', ')}.` : '';
    
    // Create a system prompt to define the character's voice and knowledge
    const systemPrompt = `You are ${characterInfo}. ${traits} 
      Respond as this historical figure would, with their speaking style, knowledge, 
      and perspectives limited to what they would have known in their time period. 
      Keep responses concise (2-3 paragraphs maximum).`;
    
    logger.info(`Generating OpenAI response for ${character.name}`);
      // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY === 'fallback-key' ||
        process.env.OPENAI_API_KEY.includes('your-openai') ||
        process.env.OPENAI_API_KEY.includes('test_your_openai_key')) {
      logger.warn('No valid OpenAI API key found, using fallback response generation');
      return generateFallbackResponse(userMessage, character);
    }
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    const content = response.choices[0]?.message?.content?.trim() || 
      `As ${character.name}, I find your question most intriguing, but I'm unable to provide a detailed response at this moment.`;
    
    return content;
  } catch (error) {
    logger.error(`Error generating OpenAI response for ${character.name}:`, error);
    return generateFallbackResponse(userMessage, character);
  }
}

// Fallback response generation without OpenAI
function generateFallbackResponse(userMessage: string, character: CharacterDetail): string {
  const characterId = character.characterId || character.id;
  let content = `This is a response from ${character.name} to your message: "${userMessage}"`;
  
  // Generate specific responses based on character
  if (characterId === '1') { // Socrates
    content = `I must question you on this: "${userMessage}". What do you truly mean by that? As I always say, the unexamined life is not worth living.`;
  } else if (characterId === '2') { // Marie Curie
    content = `Interesting question: "${userMessage}". In my scientific observations, I have found that one must never lose curiosity. Nothing in life is to be feared, it is only to be understood.`;
  } else if (characterId === '3') { // Sun Tzu
    content = `When you ask "${userMessage}", you must consider the strategic implications. Know yourself, know your enemy, and you need not fear the result of a hundred battles.`;
  } else if (characterId === '4') { // Leonardo da Vinci
    content = `Your inquiry about "${userMessage}" fascinates me. I believe simplicity is the ultimate sophistication. Let us examine this from multiple perspectives.`;
  } else if (characterId === '5') { // Shakespeare
    content = `To ponder "${userMessage}" or not to ponder, that is the question! All the world's a stage, and all the men and women merely players. Let me share my thoughts on this matter.`;
  } else {
    // For other characters, use their traits and background to inform the response
    if (character.name && character.background) {
      content = `As ${character.name}, ${character.background.split('.')[0]}. I find your question about "${userMessage}" most intriguing.`;
    }
  }
      
      return content;
    }      // Get character details to personalize responses
    const characterDetails: CharacterDetail[] = await Promise.all(
      characters.map(async (characterId: string) => {
        try {
          // Try to fetch character details from DynamoDB
          // Use both character ID formats to handle potential differences in the database
          let getResult = await dynamoDB.send(new GetCommand({
            TableName: TableNames.CHARACTERS,
            Key: { 
              characterId: characterId // Primary key format according to schema
            }
          }));
          
          // If item not found, try alternative key format
          if (!getResult.Item) {
            getResult = await dynamoDB.send(new GetCommand({
              TableName: TableNames.CHARACTERS,
              Key: { 
                id: characterId 
              }
            }));
          }
          
          if (getResult.Item) {
            logger.info(`Found character details for ID ${characterId}`);
            return getResult.Item as CharacterDetail;
          }
        } catch (error) {
          logger.warn(`Failed to get character details for ID ${characterId}:`, error);
        }
        
        // Fallback to default character details based on ID
        return getDefaultCharacterById(characterId);
      })
    );// Generate responses for each character using OpenAI
    logger.info('Generating responses using OpenAI for all selected characters');
    
    try {      // Check if OpenAI API key is set
      if (!process.env.OPENAI_API_KEY || 
          process.env.OPENAI_API_KEY === 'fallback-key' ||
          process.env.OPENAI_API_KEY.includes('your-openai') ||
          process.env.OPENAI_API_KEY.includes('test_your_openai_key')) {
        logger.error('OpenAI API key is not properly configured for panel discussion');
        throw new Error('OpenAI API key is not properly configured');
      }
      
      const responses = await Promise.all(characterDetails.map(async (character) => {
        try {
          // Use character details or fallback to defaults
          const characterId = character.characterId || character.id;
          const name = character.name || `Character ${characterId}`;
          
          // Generate personalized response based on character traits and background using OpenAI
          const content = await generateCharacterResponse(message, character);
          
          return {
            id: uuidv4(),
            characterId,
            name,
            content,
            timestamp: new Date().toISOString()
          };
        } catch (characterError) {
          logger.error(`Error generating response for character ${character.name}:`, characterError);
          return {
            id: uuidv4(),
            characterId: character.characterId || character.id,
            name: character.name || `Character ${character.characterId || character.id}`,
            content: `As ${character.name}, I'm afraid I cannot respond at the moment due to technical difficulties.`,
            timestamp: new Date().toISOString()
          };
        }
      }));
      
      // In a production scenario, we would save this to DynamoDB
      logger.info(`Generated ${responses.length} responses for conversation ${conversationId}`);
      
      // Fixed response structure for better frontend compatibility
      return res.status(201).json({
        status: 'success',
        message: 'Responses generated successfully',
        data: {
          conversationId,
          responses
        }
      });
    } catch (error: any) {
      logger.error('Error generating responses:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate responses. Please try again later.',
        error: error.message
      });
    }
  } catch (error) {
    logger.error('Error processing conversation:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing your message',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Get conversation history
conversationRoutes.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Try to get from Redis cache first
    const redisClient = getRedisClient();
    const cacheKey = `conversation:${id}`;
    
    if (isRedisEnabled() && redisClient) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        logger.info(`Returning conversation ${id} from cache`);
        return res.status(200).json(JSON.parse(cachedData));
      }
    }
    
    // In a real implementation, we would fetch from DynamoDB
    // For now, generate mock conversation data
    
    // Mock conversation data
    const conversation = {
      id,
      messages: [
        {
          id: 'msg1',
          sender: 'user',
          content: 'What do you think about knowledge and wisdom?',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'msg2',
          sender: 'character',
          characterId: '1',
          characterName: 'Socrates',
          content: 'True wisdom comes to each of us when we realize how little we understand about life, ourselves, and the world around us.',
          timestamp: new Date(Date.now() - 3580000).toISOString()
        },
        {
          id: 'msg3',
          sender: 'character',
          characterId: '2',
          characterName: 'Marie Curie',
          content: 'Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.',
          timestamp: new Date(Date.now() - 3560000).toISOString()
        },
        {
          id: 'msg4',
          sender: 'user',
          content: 'How do you approach challenges?',
          timestamp: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: 'msg5',
          sender: 'character',
          characterId: '1',
          characterName: 'Socrates',
          content: 'The secret of change is to focus all of your energy, not on fighting the old, but on building the new.',
          timestamp: new Date(Date.now() - 1780000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const response = {
      status: 'success',
      data: conversation
    };
    
    // Cache the result for future requests (5 minutes)
    if (isRedisEnabled() && redisClient) {
      await redisClient.set(cacheKey, JSON.stringify(response), 'EX', 300);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Error retrieving conversation ${id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve conversation'
    });
  }
});
