const express = require('express');
const router = express.Router();
const characters = require('../data/characters');

// GET all available characters
router.get('/', async (req, res) => {
  try {
    res.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to retrieve characters' });
  }
});

// GET a single character by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const character = characters.find(c => c.id === id);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    
    res.json(character);
  } catch (error) {
    console.error(`Error fetching character ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve character' });
  }
});

module.exports = router; 