import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { getEnv } from './env';

let redisClient: Redis | null = null;
let redisEnabled = true;

export async function createRedisClient() {
  const env = getEnv();
  if (!env.REDIS_URL) {
    logger.warn('Redis URL is not defined, Redis functionality will be disabled');
    redisEnabled = false;
    return null;
  }

  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) {
          // After 3 retry attempts, disable Redis
          logger.warn('Redis connection failed after 3 retries, Redis functionality will be disabled');
          redisEnabled = false;
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
      // Don't throw an error, just log it
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      redisEnabled = true;
    });

    return redisClient;
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Don't throw the error, just log it and disable Redis
    redisEnabled = false;
    return null;
  }
}

export function getRedisClient() {
  if (!redisEnabled) {
    return null;
  }
  
  if (!redisClient) {
    logger.warn('Redis client not initialized, some functionality may be limited');
    return null;
  }
  
  return redisClient;
}

export function isRedisEnabled() {
  return redisEnabled;
}

export async function closeRedisConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
} 
