import { ResponseStyle } from '../../types/conversation';

export interface IntentClassification {
  responseStyle: ResponseStyle;
  expectsSubstance: boolean;
  reason: string;
}

export function classifyMessageIntent(message: string): IntentClassification {
  const normalized = message.trim().toLowerCase();

  const patterns = {
    casualGreeting:
      /^(yo|hey|hi|hello|sup|what's up|greetings?|morning|afternoon|evening|good\s+(morning|afternoon|evening|day))\s*(panel|everyone|folks|guys|gentlem[ae]n|gentlmen|genetlmen|gentelmen|lad(y|ies)|girls?|all|friends?)?[!.\s]*$/i,
    socialCheckIn: /how('s| is)? it going|what's up|how are you|how've you been|how was your day/i,
    simpleAcknowledgment: /^(ok|sure|yeah|yep|thanks|got it|cool|alright)[\s!.]*$/i,
    simpleFactual:
      /^(what\s+(is\s+)?(\d+\s*[\+\-\*\/]\s*\d+|\d+[\+\-\*\/]\d+)|count\s+to\s+\d+)(\?)?$/i,
    basicFactRequest: /^(what|when|where|who)\s+(is|was|are|were)\s+[^?]*\??\s*$/i,
    philosophicalQuestion:
      /meaning|purpose|truth|justice|love|death|existence|god|universe|philosophy|soul|consciousness|reality|ethics|morality/i,
    substantialInquiry: /what do you think about|tell me about|explain|discuss|thoughts on|what's your take/i,
    topicalQuestion: /about\s+(science|art|war|politics|religion|history|literature|music|philosophy|strategy)/i,
  };

  if (patterns.casualGreeting.test(normalized) || patterns.socialCheckIn.test(normalized) || patterns.simpleAcknowledgment.test(normalized)) {
    return {
      responseStyle: 'brief_friendly',
      expectsSubstance: false,
      reason: 'Casual interaction',
    };
  }

  if (patterns.simpleFactual.test(normalized) || (patterns.basicFactRequest.test(normalized) && normalized.length < 50)) {
    return {
      responseStyle: 'brief_informative',
      expectsSubstance: false,
      reason: 'Simple factual request',
    };
  }

  if (patterns.topicalQuestion.test(normalized)) {
    return {
      responseStyle: 'moderate_engagement',
      expectsSubstance: true,
      reason: 'Topic-specific question',
    };
  }

  if (patterns.philosophicalQuestion.test(normalized) || patterns.substantialInquiry.test(normalized) || normalized.length > 120) {
    return {
      responseStyle: 'full_engagement',
      expectsSubstance: true,
      reason: 'Substantive discussion',
    };
  }

  return {
    responseStyle: 'full_engagement',
    expectsSubstance: true,
    reason: 'Default full engagement',
  };
}

export function responseStyleInstruction(style: ResponseStyle): string {
  if (style === 'brief_friendly') {
    return 'Keep each response to 1-2 short sentences. Warm and conversational.';
  }
  if (style === 'brief_informative') {
    return 'Keep each response concise (1-3 sentences), factual, and clear.';
  }
  if (style === 'moderate_engagement') {
    return 'Use 2-4 sentences with one concrete viewpoint and one reaction to another speaker.';
  }
  return 'Use 3-6 sentences with depth, conviction, and direct engagement with other speakers.';
}
