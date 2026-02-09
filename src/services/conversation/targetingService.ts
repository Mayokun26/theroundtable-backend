import { Character, TargetingAnalysis } from '../../types/conversation';

function isSimpleGreeting(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  const greetingPatterns = [
    /^(hi|hey|hello|greetings?|morning|afternoon|evening|good (morning|afternoon|evening|day)|howdy|yo|sup|what'?s up)[\s,!.]*$/i,
    /^(hi|hey|hello|greetings?|morning|afternoon|evening|good (morning|afternoon|evening|day)) (everyone|all|folks|gentlem[ae]n|gentlmen|genetlmen|gentelmen|lad(y|ies)|girls?|friends?)[\s,!.]*$/i,
    /^(thanks?|thank you|bye|goodbye|see ya|cheers|nice (talking|chatting|speaking))[\s,!.]*$/i,
  ];
  return greetingPatterns.some((pattern) => pattern.test(trimmed));
}

function calculateConvictionTrigger(message: string, character: Character): number {
  let maxConviction = 0;
  const messageWords = message
    .toLowerCase()
    .split(/\s+|[.,!?;:]/)
    .filter((word) => word.length > 1);

  if (character.core_beliefs) {
    for (const belief of character.core_beliefs) {
      if (!belief.triggers?.length) {
        continue;
      }

      const matched = belief.triggers.some((trigger) => {
        const triggerLower = trigger.toLowerCase();
        return messageWords.some((word) => word === triggerLower || triggerLower.includes(word) || word.includes(triggerLower));
      });

      if (matched) {
        maxConviction = Math.max(maxConviction, belief.conviction ?? 0);
      }
    }
  }

  if (character.topic_convictions) {
    for (const [topic, conviction] of Object.entries(character.topic_convictions)) {
      if (messageWords.some((word) => word === topic.toLowerCase() || topic.toLowerCase().includes(word) || word.includes(topic.toLowerCase()))) {
        maxConviction = Math.max(maxConviction, conviction);
      }
    }
  }

  return maxConviction;
}

export function analyzeMessageTargeting(
  message: string,
  availableCharacters: Character[]
): TargetingAnalysis {
  const messageWords = message.toLowerCase().split(/\s+/);
  const messageLower = message.toLowerCase();

  const targeting: TargetingAnalysis = {
    directlyAddressed: [],
    mentionedCharacters: [],
    topicTriggers: new Map<string, number>(),
    genderMismatch: null,
    isGreeting: isSimpleGreeting(message),
  };

  const hasFemales = availableCharacters.some((c) => c.gender === 'female');
  const hasMales = availableCharacters.some((c) => c.gender === 'male');

  const maleTerms = /\b(gentlem[ae]n|gentlmen|genetlmen|gentelmen|sirs?|boys|lads|gents|guys)\b/i;
  const femaleTerms = /\b(lad(y|ies)|girls?|madams?|gals?)\b/i;

  if (hasFemales && maleTerms.test(messageLower)) {
    targeting.genderMismatch = { type: 'excluded_women', excludedGenders: ['female'] };
  } else if (hasMales && femaleTerms.test(messageLower)) {
    targeting.genderMismatch = { type: 'excluded_men', excludedGenders: ['male'] };
  }

  for (const character of availableCharacters) {
    const nameParts = character.name.toLowerCase().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    const isDirectlyAddressed =
      nameParts.every((part) => messageWords.includes(part)) ||
      new RegExp(`${firstName},|@${firstName}|hey ${firstName}|${firstName}\?`, 'i').test(messageLower) ||
      new RegExp(`${lastName},|@${lastName}|hey ${lastName}|${lastName}\?`, 'i').test(messageLower) ||
      Boolean(
        character.common_nicknames?.some((nick) =>
          new RegExp(`${nick.toLowerCase()},|@${nick.toLowerCase()}|hey ${nick.toLowerCase()}`, 'i').test(messageLower)
        )
      );

    if (isDirectlyAddressed) {
      targeting.directlyAddressed.push(character.id);
    } else if (messageWords.includes(firstName) || messageWords.includes(lastName)) {
      targeting.mentionedCharacters.push(character.id);
    }

    const convictionScore = calculateConvictionTrigger(message, character);
    if (convictionScore > 0) {
      targeting.topicTriggers.set(character.id, convictionScore);
    }
  }

  return targeting;
}

export function selectRespondingCharacters(
  targeting: TargetingAnalysis,
  availableCharacters: Character[]
): string[] {
  const availableIds = availableCharacters.map((character) => character.id);
  const responding: string[] = [];

  if (targeting.isGreeting) {
    if (targeting.genderMismatch) {
      const excludedCharacters = availableCharacters.filter(
        (character) => character.gender && targeting.genderMismatch?.excludedGenders.includes(character.gender)
      );
      if (excludedCharacters.length > 0) {
        responding.push(excludedCharacters[0].id);
      }
    }

    if (responding.length === 0) {
      responding.push(...availableIds.slice(0, Math.min(2, availableIds.length)));
    }

    return [...new Set(responding)];
  }

  if (targeting.directlyAddressed.length > 0) {
    responding.push(...targeting.directlyAddressed);
  }

  if (targeting.genderMismatch && responding.length === 0) {
    const excludedCharacters = availableCharacters.filter(
      (character) => character.gender && targeting.genderMismatch?.excludedGenders.includes(character.gender)
    );
    if (excludedCharacters.length > 0) {
      responding.push(excludedCharacters[0].id);
    }
  }

  const highConvictionCharacters = Array.from(targeting.topicTriggers.entries())
    .filter(([, conviction]) => conviction >= 9)
    .map(([characterId]) => characterId)
    .filter((id) => !responding.includes(id));

  if (responding.length < 3) {
    responding.push(...highConvictionCharacters.slice(0, 1));
  }

  if (responding.length === 0) {
    const moderateConvictionCharacters = Array.from(targeting.topicTriggers.entries())
      .filter(([, conviction]) => conviction >= 7 && conviction < 9)
      .sort(([, a], [, b]) => b - a)
      .map(([characterId]) => characterId)
      .filter((id) => !responding.includes(id));

    if (moderateConvictionCharacters.length > 0) {
      responding.push(...moderateConvictionCharacters.slice(0, 2));
    } else {
      responding.push(...availableIds);
    }
  }

  return [...new Set(responding)];
}
