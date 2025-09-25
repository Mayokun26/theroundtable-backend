import express from 'express';

export const healthRoutes = express.Router();

// Health check endpoint
healthRoutes.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API server is running',
    timestamp: new Date().toISOString()
  });
}); 