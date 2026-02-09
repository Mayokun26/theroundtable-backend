describe('redis memory adapter null-client fallback', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('uses in-memory fallback when getRedisClient returns null', async () => {
    jest.doMock('../config/redis', () => ({
      createRedisClient: jest.fn().mockResolvedValue(null),
      getRedisClient: jest.fn().mockReturnValue(null),
    }));

    const { RedisConversationStore } = await import('../services/conversation/memory/redisStore');
    const store = new RedisConversationStore();

    await store.addMessage('null-client-session', {
      sender: 'user',
      content: 'hello-from-fallback',
      timestamp: Date.now(),
    });

    const context = await store.getSessionContext('null-client-session');
    expect(context.messages.length).toBe(1);
    expect(context.messages[0].content).toBe('hello-from-fallback');
  });
});
