const express = require('express');
const router = express.Router();
const { generateResponse } = require('../services/aiService');
const characters = require('../data/characters');

// In-memory store for conversations (in a real app, this would be a database)
const conversations = {};

// Generate a simple UUID for conversation IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper function to get character data
function getCharacterData(characterId) {
  return characters.find(c => c.id === characterId) || null;
}

// POST - Create a new conversation or add message to existing one
router.post('/', async (req, res) => {
  try {
    const { message, characterIds, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return res.status(400).json({ error: 'At least one character ID is required' });
    }
    
    // Validate all character IDs
    const invalidCharacters = characterIds.filter(id => !getCharacterData(id));
    if (invalidCharacters.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid character IDs provided', 
        invalidIds: invalidCharacters 
      });
    }
    
    // Get or create conversation
    let conversation;
    if (conversationId && conversations[conversationId]) {
      conversation = conversations[conversationId];
    } else {
      const newId = generateId();
      conversations[newId] = {
        id: newId,
        messages: [],
        characterIds: characterIds,
        createdAt: new Date().toISOString()
      };
      conversation = conversations[newId];
    }
    
    // Add user message to history
    conversation.messages.push({
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Get previous AI responses in this conversation for context
    const previousResponses = conversation.messages
      .filter(msg => msg.sender !== 'user')
      .map(msg => ({
        characterId: msg.characterId,
        name: msg.name,
        content: msg.content
      }));
    
    // Generate AI responses for each character
    const characterResponses = [];
    for (const characterId of characterIds) {
      try {
        const character = getCharacterData(characterId);
        if (!character) continue;
        
        // Generate AI response
        const content = await generateResponse(character, message, previousResponses);
        
        // Add response to results
        characterResponses.push({
          characterId,
          name: character.name,
          content,
          timestamp: new Date().toISOString()
        });
        
        // Add to conversation history
        conversation.messages.push({
          sender: 'ai',
          characterId,
          name: character.name,
          content,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Error generating response for character ${characterId}:`, error);
        // Continue with other characters if one fails
      }
    }
    
    res.status(200).json({
      conversationId: conversation.id,
      responses: characterResponses
    });
  } catch (error) {
    console.error('Error in conversation handler:', error);
    res.status(500).json({ error: 'Failed to process conversation' });
  }
});

// GET - Retrieve conversation history
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const conversation = conversations[id];
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  res.status(200).json(conversation);
});

module.exports = router; 