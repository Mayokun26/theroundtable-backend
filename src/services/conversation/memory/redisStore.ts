import { createRedisClient, getRedisClient } from '../../../config/redis';
import { SessionContext, StoredMessage } from '../../../types/conversation';
import { logger } from '../../../utils/logger';
import { InMemoryConversationStore } from './inMemoryStore';
import { ConversationMemoryStore } from './types';

const SESSION_TTL_SECONDS = 60 * 60 * 6;

export class RedisConversationStore implements ConversationMemoryStore {
  private readonly fallback = new InMemoryConversationStore();
  private initialized = false;

  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    await createRedisClient();
  }

  private key(sessionId: string): string {
    return `conversation:session:${sessionId}`;
  }

  async getSessionContext(sessionId: string): Promise<SessionContext> {
    await this.initialize();

    const client = getRedisClient();
    if (!client) {
      return this.fallback.getSessionContext(sessionId);
    }

    try {
      const serialized = await client.get(this.key(sessionId));
      if (!serialized) {
        return { messages: [] };
      }

      const parsed = JSON.parse(serialized) as SessionContext;
      if (!Array.isArray(parsed.messages)) {
        return { messages: [] };
      }

      return parsed;
    } catch (error) {
      logger.warn('Failed to read conversation session from Redis; using fallback.', { error });
      return this.fallback.getSessionContext(sessionId);
    }
  }

  async addMessage(sessionId: string, message: StoredMessage): Promise<void> {
    await this.initialize();

    const client = getRedisClient();
    if (!client) {
      await this.fallback.addMessage(sessionId, message);
      return;
    }

    try {
      const current = await this.getSessionContext(sessionId);
      current.messages.push(message);

      if (current.messages.length > 40) {
        current.messages = current.messages.slice(-40);
      }

      await client.set(this.key(sessionId), JSON.stringify(current), 'EX', SESSION_TTL_SECONDS);
    } catch (error) {
      logger.warn('Failed to write conversation session to Redis; using fallback.', { error });
      await this.fallback.addMessage(sessionId, message);
    }
  }
}
