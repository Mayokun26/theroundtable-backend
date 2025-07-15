import express from 'express';

export const conversationRoutes = express.Router();

// Import the AI service
const { generateResponse } = require('../services/aiService');

// Import the full character data
const characters = require('../data/characters');

// Function to detect if a message is targeted at specific characters
function detectTargetedCharacters(message: string, availableCharacters: string[]): string[] {
  const messageWords = message.toLowerCase().split(/\s+/);
  const targetedCharacters: string[] = [];
  
  for (const characterId of availableCharacters) {
    const character = characters.find((char: any) => char.id === characterId);
    if (!character) continue;
    
    const nameParts = character.name.toLowerCase().split(' ');
    const hasFullName = nameParts.every((part: string) => messageWords.includes(part));
    const hasFirstName = messageWords.includes(nameParts[0]);
    const hasLastName = nameParts.length > 1 && messageWords.includes(nameParts[nameParts.length - 1]);
    
    if (hasFullName || hasFirstName || hasLastName) {
      targetedCharacters.push(characterId);
    }
  }
  
  return targetedCharacters;
}

// Character data is now imported from the characters.js file

// Create a new conversation or add a message
conversationRoutes.post('/', async (req, res) => {
  const { message, characters } = req.body;
  
  if (!message || !characters || !Array.isArray(characters)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request. Please provide a message and an array of character IDs.'
    });
  }
  
  try {
    // Check if message is targeted at specific characters
    const targetedCharacters = detectTargetedCharacters(message, characters);
    const respondingCharacters = targetedCharacters.length > 0 ? targetedCharacters : characters;
    
    // Generate responses for each character
    const responses = [];
    
    for (const characterId of respondingCharacters) {
      const character = characters.find((char: any) => char.id === characterId);
      if (!character) {
        continue; // Skip unknown characters
      }
      
      try {
        const content: string = await generateResponse(character, message, responses);
        responses.push({
          id: characterId,
          name: character.name,
          content
        });
      } catch (error) {
        console.error(`Error generating response for ${character.name}:`, error);
        // Add fallback response
        responses.push({
          id: characterId,
          name: character.name,
          content: `I apologize, but I'm having trouble formulating a response right now. Please try again.`
        });
      }
    }
    
    res.status(201).json({
      status: 'success',
      responses
    });
  } catch (error) {
    console.error('Error processing conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate responses. Please try again.'
    });
  }
});

// Get conversation history
conversationRoutes.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Mock conversation data
  const conversation = {
    id,
    messages: [
      {
        id: 'msg1',
        sender: 'user',
        content: 'What is the meaning of life?',
        timestamp: '2025-05-15T12:00:00Z'
      },
      {
        id: 'msg2',
        sender: 'character',
        characterId: '1',
        characterName: 'Socrates',
        content: 'The unexamined life is not worth living.',
        timestamp: '2025-05-15T12:00:05Z'
      }
    ]
  };
  
  res.status(200).json({
    status: 'success',
    data: conversation
  });
}); 