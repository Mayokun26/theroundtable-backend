import express from 'express';

export const conversationRoutes = express.Router();

// Import the AI service
const { generateResponse } = require('../services/aiService');

// Import the full character data
const characters = require('../data/characters');

// Import conversation memory service
const conversationMemory = require('../services/conversationMemory');

// Detect if message is a simple greeting or social pleasantry
function isSimpleGreeting(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  const greetingPatterns = [
    /^(hi|hey|hello|greetings?|good (morning|afternoon|evening|day)|howdy|yo|sup|what'?s up)[\s,!.]*$/i,
    /^(hi|hey|hello|greetings?|good (morning|afternoon|evening|day)) (everyone|all|folks|gentlemen|ladies|friends?)[\s,!.]*$/i,
    /^(thanks?|thank you|bye|goodbye|see ya|cheers|nice (talking|chatting|speaking))[\s,!.]*$/i
  ];
  return greetingPatterns.some(pattern => pattern.test(trimmed));
}

// Enhanced function to detect direct addressing and calculate response priorities
function analyzeMessageTargeting(message: string, availableCharacterIds: string[], allCharacters: any[]) {
  const messageWords = message.toLowerCase().split(/\s+/);
  const messageLower = message.toLowerCase();
  const targetingAnalysis = {
    directlyAddressed: [] as string[],
    mentionedCharacters: [] as string[],
    topicTriggers: new Map<string, number>(),
    responseNeeded: false,
    genderMismatch: null as { type: string; excludedGenders: string[] } | null,
    isGreeting: isSimpleGreeting(message)
  };

  // Check for gendered greetings
  const availableChars = availableCharacterIds.map(id => allCharacters.find(c => c.id === id)).filter(Boolean);
  const hasFemales = availableChars.some(c => c.gender === 'female');
  const hasMales = availableChars.some(c => c.gender === 'male');

  if (hasFemales && /\b(gentlemen|sirs?|boys|lads|gents|guys)\b/i.test(messageLower)) {
    targetingAnalysis.genderMismatch = { type: 'excluded_women', excludedGenders: ['female'] };
  } else if (hasMales && /\b(ladies|girls|madams?|gals)\b/i.test(messageLower)) {
    targetingAnalysis.genderMismatch = { type: 'excluded_men', excludedGenders: ['male'] };
  }

  for (const characterId of availableCharacterIds) {
    const character = allCharacters.find((char: any) => char.id === characterId);
    if (!character) continue;

    const nameParts = character.name.toLowerCase().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];

    // Enhanced direct address detection
    const isDirectlyAddressed = (
      // Full name mentions
      nameParts.every((part: string) => messageWords.includes(part)) ||
      // Direct addressing patterns
      new RegExp(`${firstName},|@${firstName}|hey ${firstName}|${firstName}\?`).test(messageLower) ||
      new RegExp(`${lastName},|@${lastName}|hey ${lastName}|${lastName}\?`).test(messageLower) ||
      // Nickname addressing (if available)
      (character.common_nicknames && character.common_nicknames.some((nick: string) =>
        new RegExp(`${nick.toLowerCase()},|@${nick.toLowerCase()}|hey ${nick.toLowerCase()}`).test(messageLower)
      ))
    );

    if (isDirectlyAddressed) {
      targetingAnalysis.directlyAddressed.push(characterId);
    } else if (messageWords.includes(firstName) || messageWords.includes(lastName)) {
      targetingAnalysis.mentionedCharacters.push(characterId);
    }

    // Check conviction triggers for this character
    if (character.core_beliefs || character.topic_convictions) {
      const convictionScore = calculateConvictionTrigger(message, character);
      if (convictionScore > 0) {
        targetingAnalysis.topicTriggers.set(characterId, convictionScore);
      }
    }
  }

  return targetingAnalysis;
}

// Calculate how strongly a character should react based on their convictions
function calculateConvictionTrigger(message: string, character: any): number {
  let maxConviction = 0;
  const messageLower = message.toLowerCase();
  const messageWords = messageLower.split(/\s+|[.,!?;:]/).filter(word => word.length > 1);

  // Check core beliefs triggers
  if (character.core_beliefs) {
    for (const belief of character.core_beliefs) {
      if (belief.triggers) {
        const matchedTriggers = belief.triggers.filter((trigger: string) => {
          const triggerLower = trigger.toLowerCase();
          return messageWords.some(word => {
            if (word === triggerLower || triggerLower.includes(word) || word.includes(triggerLower)) return true;
            // Semantic relationships
            if (triggerLower === 'philosophy' && ['wisdom', 'truth', 'meaning', 'knowledge'].includes(word)) return true;
            if (triggerLower === 'justice' && ['fairness', 'right', 'moral', 'virtue'].includes(word)) return true;
            if (triggerLower === 'science' && ['method', 'evidence', 'experiment', 'discovery'].includes(word)) return true;
            return false;
          });
        });

        if (matchedTriggers.length > 0) {
          maxConviction = Math.max(maxConviction, belief.conviction);
        }
      }
    }
  }

  // Check topic convictions
  if (character.topic_convictions) {
    for (const [topic, conviction] of Object.entries(character.topic_convictions)) {
      if (messageWords.some(word =>
        word === topic.toLowerCase() ||
        topic.toLowerCase().includes(word) ||
        word.includes(topic.toLowerCase())
      )) {
        maxConviction = Math.max(maxConviction, conviction as number);
      }
    }
  }

  return maxConviction;
}

// Determine which characters should respond based on priority
function selectRespondingCharacters(targeting: any, allCharacters: any[], availableCharacterIds: string[]): string[] {
  const responding: string[] = [];

  // SPECIAL CASE: Simple greetings - limit to 1-2 characters max
  if (targeting.isGreeting) {
    // Gender mismatch takes priority even for greetings
    if (targeting.genderMismatch) {
      const excludedCharacters = availableCharacterIds.filter(id => {
        const char = allCharacters.find(c => c.id === id);
        return char && targeting.genderMismatch.excludedGenders.includes(char.gender);
      });
      if (excludedCharacters.length > 0) {
        responding.push(excludedCharacters[0]);
      }
    }

    // If no gender mismatch, pick 1-2 characters to greet back briefly
    if (responding.length === 0) {
      const greetingResponders = availableCharacterIds.slice(0, Math.min(2, availableCharacterIds.length));
      responding.push(...greetingResponders);
    }

    return [...new Set(responding)]; // Return early for greetings
  }

  // Priority 1: Directly addressed characters (highest priority)
  if (targeting.directlyAddressed.length > 0) {
    responding.push(...targeting.directlyAddressed);
  }

  // Priority 1.5: Gender mismatch reactions (very high priority)
  if (targeting.genderMismatch && responding.length === 0) {
    const excludedCharacters = availableCharacterIds.filter(id => {
      const char = allCharacters.find(c => c.id === id);
      return char && targeting.genderMismatch.excludedGenders.includes(char.gender);
    });
    // Add one excluded character to respond
    if (excludedCharacters.length > 0) {
      responding.push(excludedCharacters[0]);
    }
  }

  // Priority 2: Characters with very high conviction (9-10) about the topic
  const highConvictionEntries = Array.from(targeting.topicTriggers.entries()) as [string, number][];
  const highConvictionCharacters = highConvictionEntries
    .filter(([_, conviction]) => conviction >= 9)
    .map(([characterId, _]) => characterId)
    .filter(id => !responding.includes(id));

  // Only add high conviction responders if we don't have too many already
  if (responding.length < 3) {
    responding.push(...highConvictionCharacters.slice(0, 1)); // Max 1 high conviction responder
  }

  // Priority 3: If no one is responding yet, get the panel to respond
  if (responding.length === 0) {
    // Add characters with moderate conviction (7-8)
    const moderateConvictionCharacters = highConvictionEntries
      .filter(([_, conviction]) => conviction >= 7 && conviction < 9)
      .sort(([_, a], [__, b]) => (b as number) - (a as number)) // Sort by conviction desc
      .map(([characterId, _]) => characterId)
      .filter(id => !responding.includes(id)); // Prevent duplicates

    if (moderateConvictionCharacters.length > 0) {
      responding.push(...moderateConvictionCharacters.slice(0, 2));
    } else {
      // Default: all available characters respond (existing behavior)
      // Filter out any already selected to prevent duplicates
      const remainingCharacters = availableCharacterIds.filter(id => !responding.includes(id));
      responding.push(...remainingCharacters);
    }
  }

  return [...new Set(responding)]; // Remove duplicates as final safeguard
}

// Character data is now imported from the characters.js file

// Create a new conversation or add a message
conversationRoutes.post('/', async (req, res) => {
  const { message, characters, sessionId = `session-${Date.now()}` } = req.body;
  
  if (!message || !characters || !Array.isArray(characters)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request. Please provide a message and an array of character IDs.'
    });
  }
  
  try {
    // Analyze message targeting and conviction triggers
    const targeting = analyzeMessageTargeting(message, characters, require('../data/characters'));
    const respondingCharacters = selectRespondingCharacters(targeting, require('../data/characters'), characters);

    const charactersData = require('../data/characters');
    console.log(`📊 TARGETING ANALYSIS:`);
    console.log(`  Directly addressed: ${targeting.directlyAddressed.map((id: string) => charactersData.find((c: any) => c.id === id)?.name).join(', ') || 'none'}`);
    console.log(`  High conviction triggers: ${Array.from(targeting.topicTriggers.entries()).filter(([_, c]) => (c as number) >= 9).map(([id, c]) => `${charactersData.find((char: any) => char.id === id)?.name}(${c})`).join(', ') || 'none'}`);
    console.log(`  Selected responders: ${respondingCharacters.map((id: string) => charactersData.find((c: any) => c.id === id)?.name).join(', ')}`);
    
    // Generate responses for each character
    const responses = [];
    const processedCharacters = new Set<string>(); // Track who has already responded

    for (const characterId of respondingCharacters) {
      // Prevent duplicate responses from same character
      if (processedCharacters.has(characterId)) {
        console.log(`⚠️ Skipping duplicate response from ${characterId}`);
        continue;
      }
      processedCharacters.add(characterId);
      const character = charactersData.find((char: any) => char.id === characterId);
      if (!character) {
        continue; // Skip unknown characters
      }
      
      try {
        // Get memory-enhanced context
        const memoryContext = conversationMemory.getEnhancedContext(sessionId, character.name);

        // Enhanced context for better conversation flow
        const enhancedContext = {
          previousResponses: responses,
          originalMessage: message,
          targetingAnalysis: targeting,
          isDirectlyAddressed: targeting.directlyAddressed.includes(characterId),
          convictionLevel: targeting.topicTriggers.get(characterId) || 0,
          genderMismatch: targeting.genderMismatch,
          isGreeting: targeting.isGreeting,
          panelCharacters: characters.map((id: string) => charactersData.find((c: any) => c.id === id)).filter(Boolean),
          memory: memoryContext,
          sessionId: sessionId
        };

        // Check if this character has unanswered questions
        if (memoryContext.dynamics.shouldAddressQuestion) {
          console.log(`❓ ${character.name} has unanswered question from ${memoryContext.dynamics.questionToAddress?.asker}`);
        }

        const content: string = await generateResponse(character, message, enhancedContext);

        const response = {
          id: characterId,
          name: character.name,
          content
        };

        responses.push(response);

        // Track in memory
        conversationMemory.addMessage(sessionId, {
          character: { id: characterId, name: character.name },
          content: content
        });

        // Check if this answers any pending questions
        if (memoryContext.dynamics.questionToAddress) {
          conversationMemory.markQuestionAnswered(
            sessionId,
            memoryContext.dynamics.questionToAddress.content,
            character.name
          );
        }
      } catch (error) {
        console.error(`Error generating response for ${character.name}:`, error);
        // Add fallback response
        responses.push({
          id: characterId,
          name: character.name,
          content: `I apologize, but I'm having trouble formulating a response right now. Please try again.`
        });
      }
    }
    
    // Track user's original message
    conversationMemory.addMessage(sessionId, {
      character: null,
      content: message,
      sender: 'user'
    });

    res.status(201).json({
      status: 'success',
      responses,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('Error processing conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate responses. Please try again.'
    });
  }
});

// Get conversation history
conversationRoutes.get('/:id', (req, res) => {
  const { id } = req.params;
  
  // Mock conversation data
  const conversation = {
    id,
    messages: [
      {
        id: 'msg1',
        sender: 'user',
        content: 'What is the meaning of life?',
        timestamp: '2025-05-15T12:00:00Z'
      },
      {
        id: 'msg2',
        sender: 'character',
        characterId: '1',
        characterName: 'Socrates',
        content: 'The unexamined life is not worth living.',
        timestamp: '2025-05-15T12:00:05Z'
      }
    ]
  };
  
  res.status(200).json({
    status: 'success',
    data: conversation
  });
}); 