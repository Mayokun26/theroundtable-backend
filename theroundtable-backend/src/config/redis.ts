import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisEnabled = true;

export async function createRedisClient() {
  // Check if Redis is explicitly disabled
  if (process.env.REDIS_ENABLED === 'false') {
    logger.info('Redis functionality is disabled via configuration');
    redisEnabled = false;
    return null;
  }

  // Construct Redis URL from individual components or use REDIS_URL directly
  const redisUrl = process.env.REDIS_URL || (() => {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = process.env.REDIS_PORT || '6379';
    const password = process.env.REDIS_PASSWORD ? `:${encodeURIComponent(process.env.REDIS_PASSWORD)}@` : '';
    return password ? `redis://${password}${host}:${port}` : `redis://${host}:${port}`;
  })();

  try {
    logger.info(`Connecting to Redis at ${redisUrl.replace(/(:.*?@)/, ':***@')}`);
    
    redisClient = new Redis(redisUrl, {
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
    // Return a dummy client or null if Redis is disabled
    return {
      get: async () => null,
      set: async () => null,
      del: async () => null,
      // Add other methods you use as needed
    } as unknown as Redis;
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