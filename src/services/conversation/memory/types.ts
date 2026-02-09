import { SessionContext, StoredMessage } from '../../../types/conversation';

export interface ConversationMemoryStore {
  getSessionContext(sessionId: string): Promise<SessionContext>;
  addMessage(sessionId: string, message: StoredMessage): Promise<void>;
}
