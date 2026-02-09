import { z } from 'zod';
import { getCharactersByIds } from '../../repositories/characterRepository';
import { ConversationRequest, ConversationResponse } from '../../types/conversation';
import { conversationMemory } from './memory';
import { classifyMessageIntent } from './intentClassifier';
import { analyzeMessageTargeting, selectRespondingCharacters } from './targetingService';
import { generatePanelResponses } from './responseGenerator';
import { logger } from '../../utils/logger';

const conversationRequestSchema = z.object({
  message: z.string().min(1),
  characters: z.array(z.string()).min(1),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
});

export function parseConversationRequest(body: unknown): ConversationRequest {
  const parsed = conversationRequestSchema.parse(body);

  return {
    message: parsed.message,
    characters: parsed.characters,
    sessionId: parsed.sessionId ?? `session-${Date.now()}`,
    requestId: parsed.requestId,
  };
}

export async function runConversationTurn(request: ConversationRequest): Promise<ConversationResponse[]> {
  const startedAt = Date.now();
  const panelCharacters = getCharactersByIds(request.characters);
  if (panelCharacters.length === 0) {
    throw new Error('No valid characters found for request.');
  }

  const targeting = analyzeMessageTargeting(request.message, panelCharacters);
  const selectedIds = selectRespondingCharacters(targeting, panelCharacters);
  const respondingCharacters = panelCharacters.filter((character) => selectedIds.includes(character.id));

  const intent = classifyMessageIntent(request.message);
  const memoryContext = await conversationMemory.getSessionContext(request.sessionId);

  const responses = await generatePanelResponses({
    message: request.message,
    sessionId: request.sessionId,
    panelCharacters,
    respondingCharacters,
    style: intent.responseStyle,
    targeting,
    memoryContext,
    requestId: request.requestId,
  });

  await conversationMemory.addMessage(request.sessionId, {
    sender: 'user',
    content: request.message,
    timestamp: Date.now(),
  });

  for (const response of responses) {
    await conversationMemory.addMessage(request.sessionId, {
      sender: 'character',
      characterId: response.id,
      characterName: response.name,
      content: response.content,
      timestamp: Date.now(),
    });
  }

  logger.info('Conversation turn complete', {
    requestId: request.requestId,
    sessionId: request.sessionId,
    panelCount: panelCharacters.length,
    responderCount: responses.length,
    style: intent.responseStyle,
    durationMs: Date.now() - startedAt,
  });

  return responses;
}
