import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createServer } from './server';
import { logger } from './utils/logger';
import { createRedisClient, isRedisEnabled } from './config/redis';
import { checkDynamoDBConnection } from './config/dynamodb';

// Load environment variables first with enhanced error handling
const envPath = path.resolve(__dirname, '../.env');
try {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('Error loading .env file:', result.error);
    } else {
      console.log('Environment variables loaded successfully from:', envPath);
    }
  } else {
    console.warn('.env file not found at path:', envPath);
  }
} catch (error) {
  console.error('Error checking for .env file:', error);
}

// Validate critical environment variables
if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY is not set in environment variables');
}

const port = process.env.PORT || 3001;

async function startServer() {
  try {
    // In Lambda environment, don't fail startup due to connection issues
    // as they will be handled per-request
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      logger.info('Running in Lambda environment - skipping connection checks');
    } else {
      // Check DynamoDB connection only in local development
      try {
        await checkDynamoDBConnection();
        logger.info('DynamoDB connection verified');
      } catch (error) {
        logger.warn('DynamoDB connection failed, continuing anyway:', error);
      }

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
    }

    // Create and start the server (only for local development)
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
      const server = createServer();
      server.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
      });
    }

  } catch (error) {
    logger.error('Failed to start server:', error);
    if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
      process.exit(1);
    }
  }
}

// Only start server if not in Lambda environment
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
} 