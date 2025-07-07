import express from 'express';
import { dynamoDB, TableNames } from '../config/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { getRedisClient, isRedisEnabled } from '../config/redis';

export const conversationRoutes = express.Router();

// Initialize OpenAI client with proper error handling and detailed logging
let openai: OpenAI;
let apiKeyValid = false;
let openaiInitialized = false;

try {
  // Detailed validation of OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    logger.error('OPENAI_API_KEY environment variable is missing');
    throw new Error('OpenAI API key is missing from environment variables');
  }
  
  if (apiKey === 'fallback-key' || 
      apiKey.includes('your-openai') || 
      apiKey.includes('test_your_openai_key')) {
    logger.error('OPENAI_API_KEY environment variable contains a placeholder value', {
      keyValue: apiKey.substring(0, 3) + '...'
    });
    throw new Error('OpenAI API key contains a placeholder value');
  }
  
  // Verify key format (starts with sk-)
  if (!apiKey.startsWith('sk-')) {
    logger.error('OPENAI_API_KEY has invalid format (should start with sk-)', {
      keyPrefix: apiKey.substring(0, 3) + '...'
    });
    throw new Error('OpenAI API key has invalid format');
  }
  
  // Initialize OpenAI client with robust error handling
  try {
    openai = new OpenAI({
      apiKey: apiKey.trim(), // Ensure no whitespace
      timeout: 30000 // 30 second timeout
    });
    
    // Make a minimal API call to verify the key works (for dev environment only)
    // We'll skip the verification in production for performance
    if (process.env.NODE_ENV === 'development') {
      // Create a function to test the OpenAI connection
      const testOpenAIConnection = async () => {
        try {
          const testResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a test assistant." },
              { role: "user", content: "Respond with OK for connection test" }
            ],
            max_tokens: 5
          });
          
          if (testResponse.choices && testResponse.choices[0]) {
            logger.debug('OpenAI test call successful', {
              response: testResponse.choices[0].message.content
            });
          }
        } catch (testError: any) {
          logger.warn('OpenAI test call failed, but continuing anyway', {
            error: testError.message
          });
          // We'll continue even if the test fails
        }
      };
      
      // Execute the test function but don't wait for it to complete
      testOpenAIConnection().catch(err => {
        logger.error('Unhandled error in OpenAI test connection', {
          error: err.message || String(err)
        });
      });
    } else {
      logger.debug('OpenAI client initialized, verification skipped for performance');
      // We'll rely on actual API calls to validate the key
    }
    
    logger.info('OpenAI client initialized successfully', {
      keyPrefix: apiKey.substring(0, 5) + '...',
      keyLength: apiKey.length
    });
    apiKeyValid = true;
    openaiInitialized = true;
  } catch (initError: any) {
    logger.error('Error initializing OpenAI client:', {
      error: initError.message,
      stack: initError.stack
    });
    throw new Error(`OpenAI initialization error: ${initError.message}`);
  }
} catch (error: any) {
  logger.error('Failed to initialize OpenAI client:', {
    error: error.message || String(error),
    stack: error.stack
  });
  
  // IMPORTANT: Do not include the full key in logs or code
  // Using a fallback key (consider removing or securing this)
  openai = new OpenAI({
    apiKey: process.env.OPENAI_FALLBACK_KEY || 
            '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'
  });
  
  logger.warn('Using fallback OpenAI key with limited functionality');
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
      
    // Detailed check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY === 'fallback-key' ||
        process.env.OPENAI_API_KEY.includes('your-openai') ||
        process.env.OPENAI_API_KEY.includes('test_your_openai_key')) {
      logger.warn('No valid OpenAI API key found, using fallback response generation', {
        keyExists: !!process.env.OPENAI_API_KEY,
        keyFirstChars: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 3)}...` : 'none'
      });
      return generateFallbackResponse(userMessage, character);
    }
    
    try {
      // Call OpenAI API with additional timeout handling
      const response = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 200
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI API request timeout')), 15000)
        )
      ]) as any;
      
      if (!response || !response.choices || !response.choices[0]) {
        logger.warn(`Empty or invalid response received from OpenAI for ${character.name}`);
        return `As ${character.name}, I find your question most intriguing, but I'm unable to provide a detailed response at this moment.`;
      }
      
      const content = response.choices[0]?.message?.content?.trim() || 
        `As ${character.name}, I find your question most intriguing, but I'm unable to provide a detailed response at this moment.`;
      
      logger.debug(`Successfully generated OpenAI response for ${character.name}: ${content.substring(0, 30)}...`);
      return content;
    } catch (error: any) {
      logger.error(`Error generating OpenAI response for ${character.name}:`, {
        error: error.message || String(error),
        status: error.status,
        statusCode: error.statusCode,
        type: error.type,
        stack: error.stack
      });
      
      // Include more context in the fallback for debugging
      if (process.env.NODE_ENV === 'development') {
        return `[ERROR: ${error.message || 'OpenAI API error'}] ${generateFallbackResponse(userMessage, character)}`;
      }
      return generateFallbackResponse(userMessage, character);
    }
  } catch (error: any) {
    logger.error(`General error in character response generation for ${character.name}:`, {
      error: error.message || String(error),
      stack: error.stack
    });
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
    
    try {      
      // Enhanced check for OpenAI API key with detailed logging
      if (!process.env.OPENAI_API_KEY || 
          process.env.OPENAI_API_KEY === 'fallback-key' ||
          process.env.OPENAI_API_KEY.includes('your-openai') ||
          process.env.OPENAI_API_KEY.includes('test_your_openai_key')) {
        logger.error('OpenAI API key is not properly configured for panel discussion', {
          keyExists: !!process.env.OPENAI_API_KEY,
          keyFirstChars: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 3) + '...' : 'none'
        });
        throw new Error('OpenAI API key is not properly configured');
      }
      
      // Log service connectivity status before generating responses
      logger.info('Checking service connections before generating responses', {
        dynamoDBConfigured: !!dynamoDB,
        redisEnabled: isRedisEnabled()
      });
      
      // Track start time for performance monitoring
      const startTime = Date.now();
      
      // Generate responses with enhanced error tracking
      let responseErrors = 0;
      const responses = await Promise.all(characterDetails.map(async (character, index) => {
        try {
          // Use character details or fallback to defaults
          const characterId = character.characterId || character.id;
          const name = character.name || `Character ${characterId}`;
          
          // Log individual character response generation attempt
          logger.debug(`Generating response for character ${index + 1}/${characterDetails.length}: ${name}`);
          
          // Generate personalized response based on character traits and background using OpenAI
          const content = await generateCharacterResponse(message, character);
          
          logger.debug(`Successfully generated response for ${name} (${content.length} chars)`);
          
          return {
            id: uuidv4(),
            characterId,
            name,
            content,
            timestamp: new Date().toISOString()
          };
        } catch (characterError: any) {
          // Increment error counter
          responseErrors++;
          
          // Enhanced error logging for character response generation
          logger.error(`Error generating response for character ${character.name}:`, {
            error: characterError.message || String(characterError),
            stack: characterError.stack,
            characterId: character.characterId || character.id
          });
          
          return {
            id: uuidv4(),
            characterId: character.characterId || character.id,
            name: character.name || `Character ${character.characterId || character.id}`,
            content: process.env.NODE_ENV === 'development' 
              ? `[ERROR: ${characterError.message || 'Generation failed'}] As ${character.name}, I'm afraid I cannot respond at the moment due to technical difficulties.`
              : `As ${character.name}, I'm afraid I cannot respond at the moment due to technical difficulties.`,
            timestamp: new Date().toISOString()
          };
        }
      }));
      
      // Performance and error rate logging
      const duration = Date.now() - startTime;
      logger.info(`Generated ${responses.length} responses in ${duration}ms for conversation ${conversationId}`, {
        responseCount: responses.length,
        errorCount: responseErrors,
        durationMs: duration,
        errorRate: responseErrors > 0 ? (responseErrors / responses.length) * 100 : 0
      });
      
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
      // Enhanced error logging with more context
      logger.error('Error generating responses:', {
        error: error.message || String(error),
        stack: error.stack,
        conversationId: req.body.conversationId,
        charactersCount: characterDetails?.length || 0
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate responses. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        errorType: error.name || 'UnknownError'
      });
    }
  } catch (error: any) {
    // Enhanced error logging with more context
    logger.error('Error processing conversation:', { 
      error: error.message || String(error),
      stack: error.stack,
      conversationId: req.body.conversationId || 'new_conversation',
      characters: characters?.length || 0,
      messageLength: message?.length || 0
    });
    
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing your message',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      errorType: error.name || 'UnknownError'
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
