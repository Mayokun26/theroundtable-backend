import { SessionContext, StoredMessage } from '../../../types/conversation';
import { ConversationMemoryStore } from './types';

const SESSION_TTL_MS = 1000 * 60 * 60 * 6;

interface SessionRecord {
  context: SessionContext;
  lastUpdated: number;
}

export class InMemoryConversationStore implements ConversationMemoryStore {
  private sessions = new Map<string, SessionRecord>();

  async getSessionContext(sessionId: string): Promise<SessionContext> {
    this.cleanupExpired();

    const existing = this.sessions.get(sessionId);
    if (existing) {
      return existing.context;
    }

    const context: SessionContext = { messages: [] };
    this.sessions.set(sessionId, { context, lastUpdated: Date.now() });
    return context;
  }

  async addMessage(sessionId: string, message: StoredMessage): Promise<void> {
    const context = await this.getSessionContext(sessionId);
    context.messages.push(message);

    if (context.messages.length > 40) {
      context.messages = context.messages.slice(-40);
    }

    this.sessions.set(sessionId, { context, lastUpdated: Date.now() });
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [sessionId, record] of this.sessions.entries()) {
      if (now - record.lastUpdated > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
