import dotenv from 'dotenv';
import { createServer } from './server';
import { logger } from './utils/logger';
import { connectDB } from './config/database';
import { createRedisClient, isRedisEnabled } from './config/redis';

dotenv.config();

const port = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Connected to MongoDB');

    // Initialize Redis - but don't stop if it fails
    try {
      await createRedisClient();
      if (isRedisEnabled()) {
        logger.info('Connected to Redis');
      } else {
        logger.warn('Redis is disabled, application will continue with limited functionality');
      }
    } catch (error) {
      logger.warn('Failed to connect to Redis, continuing without Redis:', error);
    }

    // Create and start the server
    const server = createServer();
    server.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 