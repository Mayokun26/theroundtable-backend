import { EventEmitter } from 'events';

describe('redis config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('disables redis when REDIS_URL is missing', async () => {
    process.env.REDIS_URL = '';

    const redisModule = await import('../config/redis');
    const client = await redisModule.createRedisClient();

    expect(client).toBeNull();
    expect(redisModule.isRedisEnabled()).toBe(false);
    expect(redisModule.getRedisClient()).toBeNull();
  });

  it('initializes redis client and supports close', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const quitMock = jest.fn().mockResolvedValue(undefined);

    jest.doMock('ioredis', () => {
      return jest.fn().mockImplementation(() => {
        const emitter = new EventEmitter() as EventEmitter & { quit: () => Promise<void> };
        emitter.quit = quitMock;
        return emitter;
      });
    });

    const redisModule = await import('../config/redis');
    const client = await redisModule.createRedisClient();

    expect(client).not.toBeNull();
    expect(redisModule.getRedisClient()).not.toBeNull();

    await redisModule.closeRedisConnection();
    expect(quitMock).toHaveBeenCalled();
  });
});
