import express from 'express';
import { getAllCharacters, getCharacterById } from '../repositories/characterRepository';

export const characterRoutes = express.Router();

characterRoutes.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'List of characters returned',
    data: getAllCharacters(),
  });
});

characterRoutes.get('/:id', (req, res) => {
  const character = getCharacterById(req.params.id);

  if (!character) {
    return res.status(404).json({
      status: 'error',
      message: 'Character not found',
    });
  }

  return res.status(200).json({
    status: 'success',
    data: character,
  });
});
