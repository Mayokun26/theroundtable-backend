import express from 'express';

export const characterRoutes = express.Router();

// Get all characters
characterRoutes.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'List of characters returned',
    data: [
      { id: '1', name: 'Socrates' },
      { id: '2', name: 'Marie Curie' },
      { id: '3', name: 'Sun Tzu' }
    ]
  });
});

// Get character by ID
characterRoutes.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Mock character data
  const character = {
    id,
    name: id === '1' ? 'Socrates' : id === '2' ? 'Marie Curie' : 'Sun Tzu',
    details: 'Character details would be here'
  };
  
  res.status(200).json({
    status: 'success',
    data: character
  });
}); 