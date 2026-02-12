import { Character, ResponseStyle, SessionContext, TargetingAnalysis } from '../../../../types/conversation';
import { responseStyleInstruction } from '../../intentClassifier';

interface BuildPanelPromptInput {
  message: string;
  sessionId: string;
  panelCharacters: Character[];
  respondingCharacters: Character[];
  style: ResponseStyle;
  targeting: TargetingAnalysis;
  memoryContext: SessionContext;
}

interface RelationshipHint {
  nickname?: string;
  sentiment?: string;
}

function voiceLimitForStyle(style: ResponseStyle): number {
  if (style === 'brief_friendly') return 220;
  if (style === 'brief_informative') return 300;
  if (style === 'moderate_engagement') return 380;
  return 460;
}

function historyLineLimitForStyle(style: ResponseStyle): number {
  if (style === 'brief_friendly') return 3;
  if (style === 'brief_informative') return 4;
  if (style === 'moderate_engagement') return 5;
  return 6;
}

function historySnippetLimitForStyle(style: ResponseStyle): number {
  if (style === 'brief_friendly') return 140;
  if (style === 'brief_informative') return 170;
  if (style === 'moderate_engagement') return 200;
  return 220;
}

function truncate(text: string | undefined, maxLength: number): string {
  if (!text) {
    return '';
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\s+|[.,!?;:()"']/)
      .map((part) => part.trim())
      .filter((part) => part.length > 2)
  );
}

function triggerRelevance(triggers: string[] | undefined, messageTokens: Set<string>): number {
  if (!triggers || triggers.length === 0) {
    return 0;
  }

  return triggers.reduce((score, trigger) => {
    const triggerToken = trigger.toLowerCase();
    if (messageTokens.has(triggerToken)) {
      return score + 2;
    }

    const hasPartialMatch = Array.from(messageTokens).some(
      (token) => token.includes(triggerToken) || triggerToken.includes(token)
    );

    return score + (hasPartialMatch ? 1 : 0);
  }, 0);
}

function selectBeliefLines(character: Character, messageTokens: Set<string>, maxBeliefs: number): string[] {
  const beliefs = character.core_beliefs ?? [];

  const ranked = beliefs
    .map((belief) => {
      const relevance = triggerRelevance(belief.triggers, messageTokens);
      return {
        statement: truncate(belief.statement, 180),
        conviction: belief.conviction ?? 0,
        score: relevance * 10 + (belief.conviction ?? 0),
        relevance,
      };
    })
    .filter((item) => Boolean(item.statement))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return [];
  }

  const relevant = ranked.filter((item) => item.relevance > 0).slice(0, maxBeliefs);
  if (relevant.length > 0) {
    return relevant.map((item) => `- ${item.statement} (${item.conviction}/10)`);
  }

  return ranked.slice(0, Math.max(1, maxBeliefs - 1)).map((item) => `- ${item.statement} (${item.conviction}/10)`);
}

function selectTopicLines(character: Character, messageTokens: Set<string>, maxTopics: number): string[] {
  const convictions = character.topic_convictions;
  if (!convictions) {
    return [];
  }

  const ranked = Object.entries(convictions)
    .map(([topic, score]) => {
      const topicLower = topic.toLowerCase();
      const isRelevant = Array.from(messageTokens).some(
        (token) => token === topicLower || token.includes(topicLower) || topicLower.includes(token)
      );

      return {
        topic,
        score,
        rank: score + (isRelevant ? 4 : 0),
        isRelevant,
      };
    })
    .sort((a, b) => b.rank - a.rank);

  const relevant = ranked.filter((item) => item.isRelevant).slice(0, maxTopics);
  const chosen = relevant.length > 0 ? relevant : ranked.slice(0, Math.max(1, Math.floor(maxTopics / 2)));

  return chosen.map((item) => `${item.topic}:${item.score}`);
}

function selectRelationshipLines(character: Character, others: Character[]): string[] {
  const relationships = character.relationships;
  if (!relationships || typeof relationships !== 'object') {
    return [];
  }

  const relationMap = relationships as Record<string, RelationshipHint>;

  return others
    .map((other) => {
      const relation = relationMap[other.id];
      if (!relation || typeof relation !== 'object') {
        return '';
      }

      const nickname = relation.nickname ? `nickname "${relation.nickname}"` : 'direct name reference';
      const sentiment = relation.sentiment ? ` (${relation.sentiment})` : '';
      return `- With ${other.name}: use ${nickname}${sentiment}`;
    })
    .filter(Boolean)
    .slice(0, 2);
}

function buildCharacterCard(
  character: Character,
  messageTokens: Set<string>,
  others: Character[],
  style: ResponseStyle,
  isHighDensityPanel: boolean
): string {
  const maxBeliefs = isHighDensityPanel ? 1 : style === 'full_engagement' ? 2 : 1;
  const maxTopics = isHighDensityPanel ? 2 : style === 'full_engagement' ? 4 : 3;
  const beliefLines = selectBeliefLines(character, messageTokens, maxBeliefs);
  const topicLines = selectTopicLines(character, messageTokens, maxTopics);
  const relationshipLines = selectRelationshipLines(character, others);

  return [
    `ID: ${character.id}`,
    `Name: ${character.name}`,
    `Era/Category: ${character.era ?? 'unknown'} / ${character.category ?? 'unknown'}`,
    `Voice signature: ${truncate(character.style, voiceLimitForStyle(style))}`,
    beliefLines.length > 0 ? `High-priority beliefs:\n${beliefLines.join('\n')}` : '',
    topicLines.length > 0 ? `Topical convictions: ${topicLines.join(', ')}` : '',
    relationshipLines.length > 0 ? `Interaction cues:\n${relationshipLines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function recentConversation(memoryContext: SessionContext, style: ResponseStyle): string {
  const lineLimit = historyLineLimitForStyle(style);
  const snippetLimit = historySnippetLimitForStyle(style);
  const lastMessages = memoryContext.messages.slice(-lineLimit);
  if (lastMessages.length === 0) {
    return 'No prior messages in this session.';
  }

  return lastMessages
    .map((message) => {
      const snippet = truncate(message.content, snippetLimit);
      if (message.sender === 'user') {
        return `User: ${snippet}`;
      }
      return `${message.characterName ?? 'Character'}: ${snippet}`;
    })
    .join('\n');
}

function interactionInstruction(targeting: TargetingAnalysis): string {
  const instructions: string[] = [];

  if (targeting.directlyAddressed.length > 0) {
    instructions.push('Characters who were directly addressed should open by acknowledging the addressee by name.');
  }

  if (targeting.genderMismatch) {
    instructions.push(
      `Gender-mismatch cue detected (${targeting.genderMismatch.type}). At least one affected character must explicitly note the exclusion and reframe inclusively.`
    );
  }

  instructions.push('Each responder should either challenge, build on, or question at least one other responder.');
  return instructions.join(' ');
}

export function buildPanelPrompt(input: BuildPanelPromptInput): { systemPrompt: string; userPrompt: string } {
  const responderNames = input.respondingCharacters.map((character) => character.name);
  const messageTokens = tokenize(input.message);
  const isHighDensityPanel = input.respondingCharacters.length >= 4;

  const cards = input.respondingCharacters
    .map((character) => {
      const others = input.respondingCharacters.filter((candidate) => candidate.id !== character.id);
      return buildCharacterCard(character, messageTokens, others, input.style, isHighDensityPanel);
    })
    .join('\n\n---\n\n');

  const systemPrompt = [
    'You are generating a multi-character panel response for a historical conversation app.',
    'Return JSON only. No markdown or commentary outside JSON.',
    `Response style: ${input.style}. ${responseStyleInstruction(input.style)}`,
    'Output schema:',
    '{"responses":[{"characterId":"string","content":"string"}]}',
    `Return exactly ${input.respondingCharacters.length} responses, one per responder.`,
    'Each response must sound distinct to that character; avoid shared phrasing.',
    interactionInstruction(input.targeting),
    'When multiple characters respond, at least half should directly reference another responder by name.',
    'Keep responses conversational and specific; avoid generic motivational language and avoid repeating long biography.',
    `Responder order: ${responderNames.join(' -> ')}`,
  ].join('\n');

  const userPrompt = [
    `Session: ${input.sessionId}`,
    `Panel members: ${input.panelCharacters.map((character) => character.name).join(', ')}`,
    `Responders: ${responderNames.join(', ')}`,
    `User message: ${input.message}`,
    'Recent session context:',
    recentConversation(input.memoryContext, input.style),
    'Responder cards:',
    cards,
    'Generate JSON now.',
  ].join('\n\n');

  return { systemPrompt, userPrompt };
}
