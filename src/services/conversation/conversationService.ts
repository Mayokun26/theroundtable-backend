import { z } from 'zod';
import { getCharactersByIds } from '../../repositories/characterRepository';
import { ConversationRequest, ConversationResponse, ResponseStyle } from '../../types/conversation';
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

function stableHash(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function salienceScore(params: {
  id: string;
  targetingDirect: string[];
  targetingMentioned: string[];
  topicTriggers: Map<string, number>;
  characterGender?: string;
  excludedGenders: string[];
}): number {
  const { id, targetingDirect, targetingMentioned, topicTriggers, characterGender, excludedGenders } = params;
  let score = topicTriggers.get(id) ?? 0;

  if (targetingDirect.includes(id)) {
    score += 8;
  }
  if (targetingMentioned.includes(id)) {
    score += 3;
  }
  if (characterGender && excludedGenders.includes(characterGender)) {
    score += 5;
  }

  return score;
}

function orderRespondersBySalience(params: {
  responderIds: string[];
  panelCharacters: Array<{ id: string; gender?: string }>;
  directlyAddressed: string[];
  mentionedCharacters: string[];
  topicTriggers: Map<string, number>;
  excludedGenders: string[];
  seedText: string;
}): string[] {
  const { responderIds, panelCharacters, directlyAddressed, mentionedCharacters, topicTriggers, excludedGenders, seedText } = params;
  const byId = new Map(panelCharacters.map((character) => [character.id, character]));
  const rotationSeed = stableHash(seedText);

  return [...responderIds].sort((left, right) => {
    const leftCharacter = byId.get(left);
    const rightCharacter = byId.get(right);

    const leftScore = salienceScore({
      id: left,
      targetingDirect: directlyAddressed,
      targetingMentioned: mentionedCharacters,
      topicTriggers,
      characterGender: leftCharacter?.gender,
      excludedGenders,
    });
    const rightScore = salienceScore({
      id: right,
      targetingDirect: directlyAddressed,
      targetingMentioned: mentionedCharacters,
      topicTriggers,
      characterGender: rightCharacter?.gender,
      excludedGenders,
    });

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const leftTie = (stableHash(`${seedText}:${left}`) + rotationSeed) % 1000;
    const rightTie = (stableHash(`${seedText}:${right}`) + rotationSeed) % 1000;
    if (rightTie !== leftTie) {
      return rightTie - leftTie;
    }

    return left.localeCompare(right);
  });
}

function targetTurnCount(style: ResponseStyle, messageLength: number, responderCount: number): number {
  const baseline =
    style === 'brief_friendly'
      ? 3
      : style === 'brief_informative'
        ? messageLength > 80
          ? 4
          : 3
        : style === 'moderate_engagement'
          ? messageLength > 120
            ? 5
            : 4
          : messageLength > 120
            ? 6
            : 5;

  return Math.max(responderCount, Math.min(6, baseline));
}

function buildTurnSequence(orderedResponderIds: string[], turns: number): string[] {
  if (orderedResponderIds.length === 0) {
    return [];
  }

  const sequence = [...orderedResponderIds];
  if (sequence.length >= turns) {
    return sequence.slice(0, turns);
  }

  const bouncePattern = orderedResponderIds.length > 1 ? orderedResponderIds.slice(0, -1).reverse() : [orderedResponderIds[0]];
  let bounceIndex = 0;
  while (sequence.length < turns) {
    sequence.push(bouncePattern[bounceIndex % bouncePattern.length]);
    bounceIndex += 1;
  }

  return sequence;
}

function summarizePanelPoint(content: string): string {
  const cleaned = content
    .replace(/^[^:]+:\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() ?? cleaned;
  if (firstSentence.length <= 120) {
    return firstSentence;
  }
  return `${firstSentence.slice(0, 117).trimEnd()}...`;
}

function ensureSingleSentence(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const sentence = normalized.split(/(?<=[.!?])\s+/)[0]?.trim() ?? normalized;
  return sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?') ? sentence : `${sentence}.`;
}

function buildModeratorResponse(params: {
  panelResponses: ConversationResponse[];
  isSessionStart: boolean;
}): ConversationResponse {
  const { panelResponses, isSessionStart } = params;
  const lead = panelResponses[0];
  const panelistName = lead?.name ?? 'the panel';
  const panelPoint = ensureSingleSentence(
    lead ? summarizePanelPoint(lead.content) : 'Each perspective added a useful angle.'
  );

  const opener = isSessionStart
    ? `Welcome to The Round Table; ${panelistName} opens with: ${panelPoint}`
    : `Strong point from ${panelistName}: ${panelPoint}`;

  const handoff = `What should we explore next: deepen ${panelistName}'s view or shift to another angle?`;

  return {
    id: 'moderator',
    name: 'Moderator',
    content: `${ensureSingleSentence(opener)} ${ensureSingleSentence(handoff)}`.trim(),
  };
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
  const orderedResponderIds = orderRespondersBySalience({
    responderIds: finalResponderIds,
    panelCharacters,
    directlyAddressed: targeting.directlyAddressed,
    mentionedCharacters: targeting.mentionedCharacters,
    topicTriggers: targeting.topicTriggers,
    excludedGenders: targeting.genderMismatch?.excludedGenders ?? [],
    seedText: `${request.sessionId}:${request.message}`,
  });
  const panelCharacterById = new Map(panelCharacters.map((character) => [character.id, character]));
  const respondingCharacters = orderedResponderIds
    .map((id) => panelCharacterById.get(id))
    .filter((character): character is NonNullable<typeof character> => Boolean(character));
  const turnCount = targetTurnCount(intent.responseStyle, request.message.length, respondingCharacters.length);
  const turnPlanIds = buildTurnSequence(orderedResponderIds, turnCount);
  const turnPlanCharacters = turnPlanIds
    .map((id) => panelCharacterById.get(id))
    .filter((character): character is NonNullable<typeof character> => Boolean(character));

  const memoryContext = await conversationMemory.getSessionContext(request.sessionId);

  const panelResponses = await generatePanelResponses({
    message: request.message,
    sessionId: request.sessionId,
    panelCharacters,
    respondingCharacters,
    turnPlanCharacters,
    style: intent.responseStyle,
    targeting,
    memoryContext,
    requestId: request.requestId,
  });
  const isSessionStart = memoryContext.messages.length === 0;
  const moderatorResponse = buildModeratorResponse({
    panelResponses,
    isSessionStart,
  });
  const responses = [...panelResponses, moderatorResponse];

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
