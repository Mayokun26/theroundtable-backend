import { createServer } from './server';
import { logger } from './utils/logger';
import { checkDynamoDBConnection } from './config/dynamodb';
import { createRedisClient, isRedisEnabled } from './config/redis';
import { getEnv, validateRuntimeEnvironment } from './config/env';

const env = getEnv();
validateRuntimeEnvironment('http');
const port = env.PORT;

export async function startServer() {
  try {
    // Connect to DynamoDB
    const dynamoConnected = await checkDynamoDBConnection();
    if (!dynamoConnected) {
      logger.error('Failed to connect to DynamoDB');
      process.exit(1);
      return;
    }
    logger.info('Connected to DynamoDB');

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
    return;
  }
}

if (require.main === module && env.NODE_ENV !== 'test') {
  void startServer();
}
