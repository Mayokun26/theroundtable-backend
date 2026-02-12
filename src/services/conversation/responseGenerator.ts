import { OpenAI } from 'openai';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';
import { Character, ConversationResponse, ResponseStyle, SessionContext, TargetingAnalysis } from '../../types/conversation';
import { buildPanelPrompt } from './prompt/v1/panelPrompt';

interface PanelGenerationInput {
  message: string;
  sessionId: string;
  panelCharacters: Character[];
  respondingCharacters: Character[];
  style: ResponseStyle;
  targeting: TargetingAnalysis;
  memoryContext: SessionContext;
  requestId?: string;
}

interface ParsedPanelOutput {
  responses: Array<{
    characterId: string;
    content: string;
  }>;
}

let openaiClient: OpenAI | null = null;
let consecutiveOpenAIFailures = 0;
let circuitOpenUntil = 0;

function getOpenAIClient(): OpenAI | null {
  if (openaiClient) {
    return openaiClient;
  }

  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return openaiClient;
}

function extractJsonObject(raw: string): string {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Model response did not include valid JSON object');
  }

  return raw.slice(firstBrace, lastBrace + 1);
}

function parsePanelOutput(raw: string): ParsedPanelOutput {
  const parsed = JSON.parse(extractJsonObject(raw)) as ParsedPanelOutput;

  if (!parsed.responses || !Array.isArray(parsed.responses)) {
    throw new Error('Model output missing responses array');
  }

  return parsed;
}

function sentenceForStyle(style: ResponseStyle): number {
  if (style === 'brief_friendly') return 1;
  if (style === 'brief_informative') return 2;
  if (style === 'moderate_engagement') return 3;
  return 4;
}

function generationParamsForStyle(
  style: ResponseStyle,
  responderCount: number,
  messageLength: number
): { maxTokens: number; temperature: number } {
  const complexityBoost = messageLength > 280 ? 180 : messageLength > 140 ? 90 : 0;
  const responderBoost = Math.max(0, responderCount - 2) * 120;

  if (style === 'brief_friendly') {
    return { maxTokens: 140 + Math.floor(responderBoost / 2) + Math.floor(complexityBoost / 3), temperature: 0.55 };
  }
  if (style === 'brief_informative') {
    return { maxTokens: 320 + responderBoost + Math.floor(complexityBoost / 2), temperature: 0.7 };
  }
  if (style === 'moderate_engagement') {
    return { maxTokens: 540 + responderBoost + complexityBoost, temperature: 0.78 };
  }
  return { maxTokens: 760 + responderBoost + complexityBoost, temperature: 0.82 };
}

function trimToSentenceLimit(text: string, limit: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const segments = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return normalized;
  }

  return segments.slice(0, limit).join(' ').trim();
}

function normalizeModelResponseContent(content: string, style: ResponseStyle, targeting: TargetingAnalysis): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (style !== 'brief_friendly') {
    return normalized;
  }

  const sentenceLimit = targeting.genderMismatch ? 2 : 1;
  const sentenceTrimmed = trimToSentenceLimit(normalized, sentenceLimit);
  const maxChars = targeting.genderMismatch ? 200 : 140;
  if (sentenceTrimmed.length <= maxChars) {
    return sentenceTrimmed;
  }

  return `${sentenceTrimmed.slice(0, maxChars - 3).trimEnd()}...`;
}

function primaryBeliefSnippet(character: Character): string | null {
  if (!character.core_beliefs || character.core_beliefs.length === 0) {
    return null;
  }

  const topBelief = [...character.core_beliefs]
    .sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0))[0]
    .statement;

  if (!topBelief) {
    return null;
  }

  return topBelief.length > 120 ? `${topBelief.slice(0, 120)}...` : topBelief;
}

function relationshipContextSnippet(character: Character, otherResponder?: Character): string | null {
  if (!otherResponder) {
    return null;
  }

  const relationships = character.relationships;
  if (!relationships || typeof relationships !== 'object') {
    return null;
  }

  const relation = (relationships as Record<string, { nickname?: string; sentiment?: string }>)[otherResponder.id];
  if (!relation || typeof relation !== 'object') {
    return null;
  }

  const nickname = relation.nickname ? `\"${relation.nickname}\"` : otherResponder.name;
  const sentiment = relation.sentiment ? ` with a ${relation.sentiment} tone` : '';
  return `I address ${otherResponder.name} as ${nickname}${sentiment}.`;
}

function styleAwareDeterministicResponse(
  character: Character,
  message: string,
  style: ResponseStyle,
  otherResponder?: Character,
  targeting?: TargetingAnalysis
): string {
  const sentences: string[] = [];
  const baseIntro = `${character.name}:`;
  const otherName = otherResponder?.name;
  const relationshipSnippet = relationshipContextSnippet(character, otherResponder);
  const isGenderMismatchAffected =
    Boolean(targeting?.genderMismatch) &&
    Boolean(character.gender) &&
    targeting?.genderMismatch?.excludedGenders.includes(String(character.gender));
  const mismatchLine = "I should be included too, so let's address everyone respectfully.";

  if (style === 'brief_friendly') {
    const relationshipLine = otherName ? `${otherName}, good to see your perspective.` : 'Good to see you.';
    sentences.push(`${baseIntro} ${relationshipLine}`);
    if (isGenderMismatchAffected) {
      sentences.push(mismatchLine);
      return sentences.slice(0, 2).join(' ');
    }
    if (otherName) {
      sentences.push('Let us keep this exchange thoughtful and concise.');
    }
    return sentences.join(' ');
  }

  if (style === 'brief_informative') {
    const beliefSnippet = primaryBeliefSnippet(character);
    sentences.push(`${baseIntro} On "${message}", my view is precise and grounded in my perspective as a ${character.category ?? 'historical thinker'}.`);
    if (otherName) {
      sentences.push(`${otherName}, I would add one concrete point from my own experience.`);
    }
    if (relationshipSnippet) {
      sentences.push(relationshipSnippet);
    }
    if (beliefSnippet) {
      sentences.push(`My guiding principle remains: ${beliefSnippet}`);
    }
    return sentences.join(' ');
  }

  sentences.push(`${baseIntro} The question of "${message}" deserves careful thought from my era and convictions.`);
  if (otherName) {
    sentences.push(`${otherName}, your point is worth engaging directly.`);
  }
  if (relationshipSnippet) {
    sentences.push(relationshipSnippet);
  }
  sentences.push('I answer from my historical convictions and lived context.');
  const beliefSnippet = primaryBeliefSnippet(character);
  if (beliefSnippet) {
    sentences.push(`A core belief I will not abandon is: ${beliefSnippet}`);
  }

  if (style === 'full_engagement') {
    sentences.push('I would challenge assumptions while staying open to principled disagreement.');
  }

  if (isGenderMismatchAffected) {
    sentences.push(mismatchLine);
  }

  return sentences.slice(0, sentenceForStyle(style)).join(' ');
}

function deterministicResponses(input: PanelGenerationInput): ConversationResponse[] {
  const responders = input.respondingCharacters;

  return responders.map((character, index) => {
    const other =
      responders.length > 1
        ? responders[(index + 1) % responders.length]
        : undefined;

    return {
      id: character.id,
      name: character.name,
      content: styleAwareDeterministicResponse(character, input.message, input.style, other, input.targeting),
    };
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`OpenAI request timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function onOpenAISuccess(): void {
  consecutiveOpenAIFailures = 0;
  circuitOpenUntil = 0;
}

function onOpenAIFailure(): void {
  const env = getEnv();
  consecutiveOpenAIFailures += 1;

  if (consecutiveOpenAIFailures >= env.OPENAI_CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + env.OPENAI_CIRCUIT_BREAKER_COOLDOWN_MS;
  }
}

export async function generatePanelResponses(input: PanelGenerationInput): Promise<ConversationResponse[]> {
  const env = getEnv();

  if (env.RESPONSE_GENERATOR_MODE === 'deterministic') {
    return deterministicResponses(input);
  }

  if (isCircuitOpen()) {
    logger.warn('OpenAI circuit breaker is open; using deterministic fallback.', {
      requestId: input.requestId,
      sessionId: input.sessionId,
      openUntil: circuitOpenUntil,
    });
    return deterministicResponses(input);
  }

  const client = getOpenAIClient();
  if (!client) {
    return deterministicResponses(input);
  }

  const { systemPrompt, userPrompt } = buildPanelPrompt({
    message: input.message,
    sessionId: input.sessionId,
    panelCharacters: input.panelCharacters,
    respondingCharacters: input.respondingCharacters,
    style: input.style,
    targeting: input.targeting,
    memoryContext: input.memoryContext,
  });

  const startedAt = Date.now();
  const { maxTokens, temperature } = generationParamsForStyle(
    input.style,
    input.respondingCharacters.length,
    input.message.length
  );

  try {
    const completion = await withTimeout(
      client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      env.OPENAI_TIMEOUT_MS
    );

    const rawOutput = completion.choices[0]?.message?.content?.trim();
    if (!rawOutput) {
      throw new Error('Model returned empty output');
    }

    const parsed = parsePanelOutput(rawOutput);
    const byId = new Map(parsed.responses.map((response) => [response.characterId, response.content]));

    const responses = input.respondingCharacters.map((character) => ({
      id: character.id,
      name: character.name,
      content: normalizeModelResponseContent(
        byId.get(character.id) ??
          styleAwareDeterministicResponse(character, input.message, input.style, undefined, input.targeting),
        input.style,
        input.targeting
      ),
    }));

    onOpenAISuccess();

    logger.info('Conversation response generation complete', {
      requestId: input.requestId,
      sessionId: input.sessionId,
      source: 'openai',
      durationMs: Date.now() - startedAt,
      responderCount: responses.length,
      promptChars: systemPrompt.length + userPrompt.length,
      maxTokens,
    });

    return responses;
  } catch (error) {
    onOpenAIFailure();

    logger.warn('OpenAI generation failed; using deterministic fallback.', {
      requestId: input.requestId,
      sessionId: input.sessionId,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown error',
      consecutiveOpenAIFailures,
    });

    return deterministicResponses(input);
  }
}
