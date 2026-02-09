import { InMemoryConversationStore } from '../services/conversation/memory/inMemoryStore';
import { RedisConversationStore } from '../services/conversation/memory/redisStore';

describe('conversation memory stores', () => {
  it('keeps only recent messages in memory store', async () => {
    const store = new InMemoryConversationStore();
    const sessionId = 'memory-window';

    for (let i = 0; i < 50; i += 1) {
      await store.addMessage(sessionId, {
        sender: 'user',
        content: `message-${i}`,
        timestamp: Date.now(),
      });
    }

    const context = await store.getSessionContext(sessionId);
    expect(context.messages.length).toBe(40);
    expect(context.messages[0].content).toBe('message-10');
    expect(context.messages[39].content).toBe('message-49');
  });

  it('falls back gracefully when Redis is unavailable', async () => {
    const store = new RedisConversationStore();
    const sessionId = 'redis-fallback';

    await store.addMessage(sessionId, {
      sender: 'user',
      content: 'hello',
      timestamp: Date.now(),
    });

    const context = await store.getSessionContext(sessionId);
    expect(context.messages.length).toBeGreaterThanOrEqual(1);
    expect(context.messages[context.messages.length - 1].content).toBe('hello');
  });
});
