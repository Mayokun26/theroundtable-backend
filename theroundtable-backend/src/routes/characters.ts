import express from 'express';

export const characterRoutes = express.Router();

// Import the full character data
const characters = require('../data/characters');

// Get all characters
characterRoutes.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'List of characters returned',
    data: characters
  });
});

// Get character by ID
characterRoutes.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Find character by ID
  const character = characters.find((char: any) => char.id === id);
  
  if (!character) {
    return res.status(404).json({
      status: 'error',
      message: 'Character not found'
    });
  }
  
  res.status(200).json({
    status: 'success',
    data: character
  });
}); 