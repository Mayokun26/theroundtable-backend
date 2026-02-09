describe('redis memory adapter', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('persists and reads session context through redis client', async () => {
    const getMock = jest.fn().mockResolvedValue(null);
    const setMock = jest.fn().mockResolvedValue('OK');

    const fakeClient = {
      get: getMock,
      set: setMock,
    };

    jest.doMock('../config/redis', () => ({
      createRedisClient: jest.fn().mockResolvedValue(fakeClient),
      getRedisClient: jest.fn().mockReturnValue(fakeClient),
    }));

    const { RedisConversationStore } = await import('../services/conversation/memory/redisStore');
    const store = new RedisConversationStore();

    await store.addMessage('session-redis', {
      sender: 'user',
      content: 'hello',
      timestamp: Date.now(),
    });

    expect(setMock).toHaveBeenCalled();

    const serialized = JSON.stringify({
      messages: [{ sender: 'user', content: 'hello', timestamp: Date.now() }],
    });
    getMock.mockResolvedValue(serialized);

    const context = await store.getSessionContext('session-redis');
    expect(context.messages.length).toBe(1);
    expect(context.messages[0].content).toBe('hello');
  });

  it('falls back when redis operations throw', async () => {
    const fakeClient = {
      get: jest.fn().mockRejectedValue(new Error('redis-read-fail')),
      set: jest.fn().mockRejectedValue(new Error('redis-write-fail')),
    };

    jest.doMock('../config/redis', () => ({
      createRedisClient: jest.fn().mockResolvedValue(fakeClient),
      getRedisClient: jest.fn().mockReturnValue(fakeClient),
    }));

    const { RedisConversationStore } = await import('../services/conversation/memory/redisStore');
    const store = new RedisConversationStore();

    await store.addMessage('session-fallback', {
      sender: 'user',
      content: 'fallback-message',
      timestamp: Date.now(),
    });

    const context = await store.getSessionContext('session-fallback');
    expect(context.messages[0].content).toBe('fallback-message');
  });
});
