import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { characterRoutes } from './routes/characters';
import { conversationRoutes } from './routes/conversations';
import { healthRoutes } from './routes/health';

export const createServer = () => {
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json());
  app.use(requestLogger);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  });
  app.use(limiter);

  // Routes
  app.use('/api/health', healthRoutes);
  app.use('/api/characters', characterRoutes);
  app.use('/api/conversations', conversationRoutes);

  // Error handling
  app.use(errorHandler);

  return app;
};

// For CommonJS compatibility
export default { createServer }; 