import express from 'express';
import { dynamoDB, TableNames } from '../config/dynamodb';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

export const conversationRoutes = express.Router();

// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'fallback-key'
});

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
    });
  }
  
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
    }
    
    // Get character details
    const characterDetails = await Promise.all(characters.map(async (characterId: string) => {
      try {
        const getResult = await dynamoDB.send(new GetCommand({
          TableName: TableNames.CHARACTERS,
          Key: { id: characterId }
        }));
        
        if (getResult.Item) {
          return getResult.Item as CharacterDetail;
        }
      } catch (error) {
        logger.warn(`Error getting character ${characterId}:`, error);
      }
      
      return getDefaultCharacterById(characterId);
    }));
    
    // Generate responses immediately with fallback method
    const responses = characterDetails.map(character => {
      const characterId = character.characterId || character.id;
      const name = character.name || `Character ${characterId}`;
      
      // Always use fallback responses to ensure immediate response
      const content = generateFallbackResponse(message, character);
      
      return {
        id: uuidv4(),
        characterId,
        name,
        content,
        timestamp: new Date().toISOString()
      };
    });
    
    logger.info(`Generated ${responses.length} fallback responses for conversation ${conversationId}`);
    
    return res.status(200).json({
      status: 'success',
      message: 'Responses generated successfully',
      data: {
        conversationId,
        responses
      }
    });
    
  } catch (error) {
    logger.error('Error handling conversation request:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate responses'
    });
  }
});

// Get conversation by ID
conversationRoutes.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // For now, return mock conversation data
    const conversation = {
      id,
      participants: ['1', '2'],  // Socrates and Marie Curie
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
        }
      ],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return res.status(200).json({
      status: 'success',
      data: conversation
    });
    
  } catch (error) {
    logger.error(`Error retrieving conversation ${id}:`, error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve conversation'
    });
  }
});
