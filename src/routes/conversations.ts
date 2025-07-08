import express from 'express';

export const conversationRoutes = express.Router();

// Create a new conversation or add a message
conversationRoutes.post('/', (req, res) => {
  const { message, characters } = req.body;
  
  if (!message || !characters || !Array.isArray(characters)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request. Please provide a message and an array of character IDs.'
    });
  }
  
  // Mock response data
  const responses = characters.map(characterId => ({
    characterId,
    name: characterId === '1' ? 'Socrates' : characterId === '2' ? 'Marie Curie' : 'Sun Tzu',
    content: `This is a mock response from character ${characterId} to the message: "${message}"`
  }));
  
  res.status(201).json({
    status: 'success',
    data: {
      conversationId: 'mock-conversation-id',
      responses
    }
  });
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