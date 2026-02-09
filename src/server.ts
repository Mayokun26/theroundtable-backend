import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { characterRoutes } from './routes/characters';
import { conversationRoutes } from './routes/conversations';
import { healthRoutes } from './routes/health';
import { getEnv } from './config/env';

export const createServer = () => {
  const env = getEnv();
  const app = express();

  // Basic middleware
  app.use(helmet());
  app.use(cors({
    origin: env.ALLOWED_ORIGINS.split(','),
    credentials: true,
  }));
  app.use(express.json());
  app.use(requestLogger);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
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
