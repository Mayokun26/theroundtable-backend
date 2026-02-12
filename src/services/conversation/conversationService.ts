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

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function enforceResponderFloor(params: {
  selectedIds: string[];
  panelIds: string[];
  directlyAddressed: string[];
  mentionedCharacters: string[];
  topicTriggers: Map<string, number>;
  minimum: number;
}): string[] {
  const { selectedIds, panelIds, directlyAddressed, mentionedCharacters, topicTriggers, minimum } = params;
  const targetCount = Math.min(minimum, panelIds.length);
  if (selectedIds.length >= targetCount) {
    return uniqueIds(selectedIds);
  }

  const sortedByConviction = Array.from(topicTriggers.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);

  const highConviction = Array.from(topicTriggers.entries())
    .filter(([, conviction]) => conviction >= 9)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);

  const priorityOrder = uniqueIds([
    ...selectedIds,
    ...directlyAddressed,
    ...highConviction,
    ...sortedByConviction,
    ...mentionedCharacters,
    ...panelIds,
  ]).filter((id) => panelIds.includes(id));

  return priorityOrder.slice(0, targetCount);
}

export async function runConversationTurn(request: ConversationRequest): Promise<ConversationResponse[]> {
  const startedAt = Date.now();
  const panelCharacters = getCharactersByIds(request.characters);
  if (panelCharacters.length === 0) {
    throw new Error('No valid characters found for request.');
  }

  const intent = classifyMessageIntent(request.message);
  const targeting = analyzeMessageTargeting(request.message, panelCharacters);
  const selectedIds = selectRespondingCharacters(targeting, panelCharacters);
  const finalResponderIds = enforceResponderFloor({
    selectedIds,
    panelIds: panelCharacters.map((character) => character.id),
    directlyAddressed: targeting.directlyAddressed,
    mentionedCharacters: targeting.mentionedCharacters,
    topicTriggers: targeting.topicTriggers,
    minimum: 3,
  });
  const respondingCharacters = panelCharacters.filter((character) => finalResponderIds.includes(character.id));

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
