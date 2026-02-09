export type ResponseStyle = 'brief_friendly' | 'brief_informative' | 'moderate_engagement' | 'full_engagement';

export interface Character {
  id: string;
  name: string;
  gender?: 'male' | 'female' | string;
  era?: string;
  category?: string;
  style?: string;
  background?: string;
  core_beliefs?: Array<{
    statement?: string;
    conviction?: number;
    triggers?: string[];
  }>;
  topic_convictions?: Record<string, number>;
  common_nicknames?: string[];
  [key: string]: unknown;
}

export interface ConversationRequest {
  message: string;
  characters: string[];
  sessionId: string;
  requestId?: string;
}

export interface ConversationResponse {
  id: string;
  name: string;
  content: string;
}

export interface StoredMessage {
  sender: 'user' | 'character';
  characterId?: string;
  characterName?: string;
  content: string;
  timestamp: number;
}

export interface SessionContext {
  messages: StoredMessage[];
}

export interface TargetingAnalysis {
  directlyAddressed: string[];
  mentionedCharacters: string[];
  topicTriggers: Map<string, number>;
  isGreeting: boolean;
  genderMismatch: { type: string; excludedGenders: string[] } | null;
}
