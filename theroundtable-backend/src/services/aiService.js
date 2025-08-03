const axios = require("axios");
const { OpenAI } = require("openai");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Load config
const { AWS_CONFIG, OPENAI_CONFIG, LLM_PRIORITY } = require("../config/aws-config");

// Initialize OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log("OpenAI client initialized successfully");
} catch (error) {
  console.warn("Failed to initialize OpenAI client:", error.message);
  openai = null;
}

/**
 * Classify the intent and expected response style for a message
 */
function classifyMessageIntent(message) {
  const normalizedMessage = message.trim().toLowerCase();
  
  // Pattern categories for intent detection
  const patterns = {
    // Social/casual interactions that expect brief responses
    casual_greeting: /^(yo|hey|hi|hello|sup|what's up|greetings?)(\s+(panel|everyone|folks|guys))?[!.\s]*$/i,
    social_check_in: /how('s| is)? it going|what's up|how are you|how've you been|how was your day|nice weather/i,
    simple_acknowledgment: /^(ok|sure|yeah|yep|thanks|got it|cool|alright)[\s!.]*$/i,
    
    // Deep/philosophical questions that expect full engagement
    philosophical_question: /meaning|purpose|why do we|truth|justice|love|death|existence|god|universe|philosophy|believe in|think about|feel about|soul|consciousness|reality|ethics|morality/i,
    substantial_inquiry: /what do you think about|tell me about|explain|discuss|thoughts on|opinion on|how do you view|what's your take/i,
    personal_deep_question: /your beliefs|your philosophy|your experience|what drives you|what motivates|personal story|life story/i,
    
    // Simple factual questions (brief but informative responses)
    simple_factual: /^(what\s+(is\s+)?(\d+\s*[\+\-\*\/]\s*\d+|\d+[\+\-\*\/]\d+)|(\d+\s*[\+\-\*\/]\s*\d+)|count\s+to\s+\d+|what.s\s+\d+\s*[\+\-\*\/]\s*\d+)(\?)?$/i,
    basic_fact_request: /^(what|when|where|who)\s+(is|was|are|were)\s+[^?]*\??\s*$/i,
    
    // Topic-specific engagement (contextual response length)
    topical_question: /about\s+(science|art|war|politics|religion|history|literature|music|philosophy|strategy|love|death|god|truth|justice|democracy|freedom|peace|education|knowledge)/i
  };
  
  // Response style classification
  let responseStyle = 'full_engagement'; // Default
  let expectsSubstance = true;
  let reasoning = 'Default to full engagement';
  
  // Check patterns in order of specificity
  if (patterns.casual_greeting.test(normalizedMessage)) {
    responseStyle = 'brief_friendly';
    expectsSubstance = false;
    reasoning = 'Casual greeting detected';
  } else if (patterns.social_check_in.test(normalizedMessage)) {
    responseStyle = 'brief_friendly';
    expectsSubstance = false;
    reasoning = 'Social check-in detected';
  } else if (patterns.simple_acknowledgment.test(normalizedMessage)) {
    responseStyle = 'brief_friendly';
    expectsSubstance = false;
    reasoning = 'Simple acknowledgment detected';
  } else if (patterns.simple_factual.test(normalizedMessage)) {
    responseStyle = 'brief_informative';
    expectsSubstance = false;
    reasoning = 'Simple factual question detected';
  } else if (patterns.basic_fact_request.test(normalizedMessage) && normalizedMessage.length < 50) {
    responseStyle = 'brief_informative';
    expectsSubstance = false;
    reasoning = 'Basic fact request detected';
  } else if (patterns.philosophical_question.test(normalizedMessage)) {
    responseStyle = 'full_engagement';
    expectsSubstance = true;
    reasoning = 'Philosophical question detected';
  } else if (patterns.substantial_inquiry.test(normalizedMessage)) {
    responseStyle = 'full_engagement';
    expectsSubstance = true;
    reasoning = 'Substantial inquiry detected';
  } else if (patterns.personal_deep_question.test(normalizedMessage)) {
    responseStyle = 'full_engagement';
    expectsSubstance = true;
    reasoning = 'Personal deep question detected';
  } else if (patterns.topical_question.test(normalizedMessage)) {
    responseStyle = 'moderate_engagement';
    expectsSubstance = true;
    reasoning = 'Topic-specific question detected';
  }
  
  // Additional context analysis
  const hasQuestionWords = /what|why|how|when|where|who|which|would|could|should|do you|can you|will you/i.test(normalizedMessage);
  const isShortMessage = normalizedMessage.length <= 20;
  const hasComplexStructure = normalizedMessage.split(/[.!?]/).length > 1;
  
  // Override for edge cases
  if (hasQuestionWords && hasComplexStructure && normalizedMessage.length > 100) {
    responseStyle = 'full_engagement';
    expectsSubstance = true;
    reasoning += ' (complex multi-part question override)';
  } else if (!hasQuestionWords && isShortMessage && !patterns.philosophical_question.test(normalizedMessage)) {
    responseStyle = 'brief_friendly';
    expectsSubstance = false;
    reasoning += ' (short non-question override)';
  }
  
  const result = {
    responseStyle,
    expectsSubstance,
    reasoning,
    messageLength: message.length,
    hasQuestionWords,
    isShortMessage,
    hasComplexStructure
  };
  
  console.log(`🎯 INTENT CLASSIFICATION: "${message.substring(0, 50)}..." → ${responseStyle} (${reasoning})`);
  return result;
}

/**
 * Analyze text for topics that might trigger character convictions
 */
function analyzeTopics(text) {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+|[.,!?;:]/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 1); // Allow shorter words like "god", "art", "war"
  
  // Also extract meaningful phrases for multi-word topics
  const phrases = [];
  const commonPhrases = [
    'divine mission', 'philosopher king', 'cave allegory', 'eternal truth', 'ideal state',
    'scientific method', 'non violence', 'civil rights', 'human nature', 'free will'
  ];
  
  commonPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      phrases.push(phrase.replace(/\s+/g, '_')); // Convert to single token
    }
  });
  
  const allTopics = [...words, ...phrases];
  console.log(`🔍 ANALYZING TOPICS: ${allTopics.slice(0, 15).join(', ')}...`);
  return allTopics;
}

/**
 * Check if a character has strong convictions about mentioned topics
 */
function checkConvictions(character, topics) {
  if (!character.core_beliefs && !character.topic_convictions) {
    return { triggered: false, maxConviction: 0, reasons: [] };
  }
  
  let maxConviction = 0;
  const triggeredBeliefs = [];
  const triggeredTopics = [];
  
  console.log(`🔍 CHECKING CONVICTIONS for ${character.name}`);
  console.log(`🔍 Topics to analyze: ${topics.slice(0, 10).join(', ')}...`);
  
  // Check core beliefs triggers with enhanced matching
  if (character.core_beliefs) {
    character.core_beliefs.forEach(belief => {
      if (belief.triggers) {
        const matchedTriggers = belief.triggers.filter(trigger => {
          const triggerLower = trigger.toLowerCase();
          return topics.some(topic => {
            // Exact match
            if (topic === triggerLower || triggerLower === topic) return true;
            // Partial match
            if (topic.includes(triggerLower) || triggerLower.includes(topic)) return true;
            // Semantic relationships for philosophy/wisdom topics
            if (triggerLower === 'philosophy' && ['wisdom', 'truth', 'meaning', 'knowledge', 'reality', 'existence'].includes(topic)) return true;
            if (triggerLower === 'wisdom' && ['philosophy', 'knowledge', 'truth', 'understanding', 'insight'].includes(topic)) return true;
            if (triggerLower === 'justice' && ['fairness', 'right', 'moral', 'virtue', 'righteousness', 'ethics'].includes(topic)) return true;
            if (triggerLower === 'god' && ['divine', 'sacred', 'holy', 'faith', 'religious', 'spiritual'].includes(topic)) return true;
            if (triggerLower === 'faith' && ['belief', 'divine', 'god', 'religious', 'sacred', 'spiritual'].includes(topic)) return true;
            if (triggerLower === 'science' && ['method', 'evidence', 'experiment', 'discovery', 'research'].includes(topic)) return true;
            if (triggerLower === 'war' && ['strategy', 'battle', 'conflict', 'military', 'tactics'].includes(topic)) return true;
            return false;
          });
        });
        
        if (matchedTriggers.length > 0) {
          maxConviction = Math.max(maxConviction, belief.conviction);
          triggeredBeliefs.push({
            belief: belief.statement,
            conviction: belief.conviction,
            triggers: matchedTriggers,
            context: belief.context
          });
          console.log(`✅ CORE BELIEF TRIGGERED: "${belief.statement}" (${belief.conviction}/10) - triggers: ${matchedTriggers.join(', ')}`);
        }
      }
    });
  }
  
  // Check topic convictions with enhanced semantic matching
  if (character.topic_convictions) {
    Object.entries(character.topic_convictions).forEach(([topic, conviction]) => {
      const topicLower = topic.toLowerCase().replace(/\s+/g, '_');
      
      const isTriggered = topics.some(msgTopic => {
        // Exact match
        if (msgTopic === topicLower || topicLower === msgTopic) return true;
        // Partial match  
        if (msgTopic.includes(topicLower) || topicLower.includes(msgTopic)) return true;
        // Enhanced semantic relationships
        if (topicLower === 'philosophy' && ['wisdom', 'truth', 'meaning', 'knowledge', 'reality', 'existence', 'thought'].includes(msgTopic)) return true;
        if (topicLower === 'wisdom' && ['philosophy', 'knowledge', 'truth', 'understanding', 'insight', 'enlightenment'].includes(msgTopic)) return true;
        if (topicLower === 'justice' && ['fairness', 'right', 'moral', 'virtue', 'righteousness', 'ethics', 'law'].includes(msgTopic)) return true;
        if (topicLower === 'god' && ['divine', 'sacred', 'holy', 'faith', 'religious', 'spiritual', 'heaven'].includes(msgTopic)) return true;
        if (topicLower === 'faith' && ['belief', 'divine', 'god', 'religious', 'sacred', 'spiritual', 'prayer'].includes(msgTopic)) return true;
        if (topicLower === 'science' && ['method', 'evidence', 'experiment', 'discovery', 'research', 'hypothesis'].includes(msgTopic)) return true;
        if (topicLower === 'truth' && ['reality', 'fact', 'honesty', 'authenticity', 'genuine', 'real'].includes(msgTopic)) return true;
        if (topicLower === 'war' && ['strategy', 'battle', 'conflict', 'military', 'tactics', 'combat'].includes(msgTopic)) return true;
        if (topicLower === 'art' && ['beauty', 'creativity', 'expression', 'aesthetic', 'artistic'].includes(msgTopic)) return true;
        if (topicLower === 'education' && ['teaching', 'learning', 'knowledge', 'school', 'study'].includes(msgTopic)) return true;
        return false;
      });
      
      if (isTriggered) {
        maxConviction = Math.max(maxConviction, conviction);
        triggeredTopics.push({ topic, conviction });
        console.log(`✅ TOPIC CONVICTION TRIGGERED: "${topic}" (${conviction}/10)`);
      }
    });
  }
  
  const result = {
    triggered: maxConviction >= 8, // Threshold for triggering responses
    maxConviction,
    triggeredBeliefs,
    triggeredTopics,
    reasons: [...triggeredBeliefs.map(b => b.belief), ...triggeredTopics.map(t => t.topic)]
  };
  
  if (result.triggered) {
    console.log(`🔥 CONVICTION TRIGGERED for ${character.name}: ${result.maxConviction}/10 - ${result.reasons.slice(0, 3).join(', ')}`);
  } else {
    console.log(`❌ NO CONVICTION TRIGGERED for ${character.name}: max ${result.maxConviction}/10`);
  }
  
  return result;
}

/**
 * Get relationship context for how a character should address others
 */
function getRelationshipContext(character, otherCharacters) {
  console.log(`🔍 GETTING RELATIONSHIP CONTEXT for ${character.name}`);
  console.log(`🔍 Other characters:`, otherCharacters.map(c => `${c.name} (ID: ${c.id})`));
  console.log(`🔍 Character has relationships:`, !!character.relationships);
  
  if (!character.relationships || !otherCharacters.length) {
    console.log(`❌ NO RELATIONSHIPS: relationships=${!!character.relationships}, otherChars=${otherCharacters.length}`);
    return '';
  }
  
  const relationshipText = otherCharacters
    .map(other => {
      const relationship = character.relationships[other.id];
      console.log(`🔍 Checking ${character.name} -> ${other.name} (ID: ${other.id}):`, relationship);
      
      if (relationship) {
        const intensityText = relationship.intensity >= 8 ? 'deeply' : 
                             relationship.intensity >= 6 ? 'respectfully' :
                             relationship.intensity >= 4 ? 'neutrally' :
                             relationship.intensity >= 2 ? 'dismissively' : 'hostilely';
        
        const relationshipEntry = `- ${other.name} (YOU CALL THEM "${relationship.nickname}"): You view them ${intensityText} because ${relationship.reason}. ADDRESS THEM AS "${relationship.nickname}" when speaking to them.`;
        console.log(`✅ RELATIONSHIP FOUND: ${relationshipEntry}`);
        return relationshipEntry;
      }
      
      const neutralEntry = `- ${other.name}: You have no particular opinion of them`;
      console.log(`⚪ NO SPECIFIC RELATIONSHIP: ${neutralEntry}`);
      return neutralEntry;
    })
    .join('\n');
  
  const fullContext = `\nRELATIONSHIP CONTEXT:\n${relationshipText}\n`;
  console.log(`🎭 FINAL RELATIONSHIP CONTEXT for ${character.name}:\n${fullContext}`);
  return fullContext;
}

/**
 * Generate a conviction-based response for characters strongly triggered by topics
 */
async function generateConvictionResponse(character, originalMessage, convictionData, context = {}) {
  const systemPrompt = `You are ${character.name} and you feel VERY STRONGLY about this topic.

CONVICTION TRIGGERED (${convictionData.maxConviction}/10):
${convictionData.triggeredBeliefs.map(b => `- ${b.belief} (${b.context})`).join('\n')}

CRITICAL RULES:
- You are compelled to speak because this touches your deepest convictions
- Reference your specific beliefs that were triggered
- Be passionate but stay in character
- This is an interjection - you're speaking out of turn because you care deeply
- Keep it brief but powerful (1-2 sentences)

YOUR VOICE & STYLE: ${character.style}

Original message that triggered you: "${originalMessage}"

Respond with conviction as ${character.name}:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: originalMessage }
      ],
      max_tokens: 450,
      temperature: 0.9 // Higher temperature for more passionate responses
    });
    
    const content = response.choices[0].message.content.trim();
    console.log(`🔥 CONVICTION RESPONSE FROM ${character.name}: ${content}`);
    return content;
  } catch (error) {
    console.error(`Error generating conviction response for ${character.name}:`, error.message);
    return null;
  }
}

/**
 * Generate a response using OpenAI API (GPT-3.5/4)
 */
async function generateOpenAIResponse(character, message, context = {}) {
  try {
    console.log(`🔥 GENERATING RESPONSE FOR ${character.name} using OpenAI...`);
    console.log(`🔥 CHARACTER STYLE: ${character.style?.substring(0, 100)}...`);
    
    // Classify message intent for response calibration
    const intentClassification = classifyMessageIntent(message);
    console.log(`🎯 INTENT for ${character.name}: ${intentClassification.responseStyle}`);
    
    // Handle both old and new context formats for backwards compatibility
    let contextText = '';
    let fullConversationText = '';
    let othersContext = '';
    
    if (Array.isArray(context)) {
      // Old format - just previous responses
      contextText = context.map(r => `${r.name}: ${r.content}`).join("\n\n");
    } else {
      // New format - full context object
      const { fullHistory = [], currentRound = [], othersContext: others = '' } = context;
      othersContext = others;
      
      // Build full conversation history for context retention - use new format if available
      if (context.fullConversationContext && context.fullConversationContext.length > 0) {
        fullConversationText = context.fullConversationContext.join('\n');
      } else {
        fullConversationText = fullHistory.map(msg => 
          `${msg.name}: ${msg.content}`
        ).join("\n\n");
      }
      
      // Build immediate context (other characters' responses to current question)
      contextText = currentRound.map(r => 
        `${r.name}: ${r.content}`
      ).join("\n\n");
    }
    
    console.log(`🔥 DEBUG - Context for ${character.name}: ${contextText ? 'YES' : 'EMPTY'}`);
    console.log(`🔥 DEBUG - Full conversation: ${fullConversationText ? 'YES' : 'EMPTY'}`);
    if (contextText) {
      console.log(`🔥 DEBUG - Context preview: ${contextText.substring(0, 200)}...`);
    }
    
    // Generate response style instructions based on intent classification
    const getResponseStyleInstructions = (intentClass) => {
      switch (intentClass.responseStyle) {
        case 'brief_friendly':
          return 'RESPONSE STYLE: Brief and friendly (1-2 sentences max). This is casual conversation - acknowledge naturally, stay in character, but don\'t lecture or elaborate extensively.';
        case 'brief_informative':
          return 'RESPONSE STYLE: Brief but informative (1-2 sentences). Give the direct answer plus one characteristic personal comment. Stay in character without over-explaining.';
        case 'moderate_engagement':
          return 'RESPONSE STYLE: Moderate engagement (2-3 sentences). Share your perspective on the topic while staying conversational and focused.';
        case 'full_engagement':
        default:
          return 'RESPONSE STYLE: Full engagement (2-4 sentences). This is a substantial topic - engage fully with your character\'s depth and perspective.';
      }
    };

    // Create dynamic system prompt based on character and context  
    let systemContent = '';
    
    if (context.isFirstSpeaker === true) {
      // FIRST SPEAKER VERSION - direct response to user
      systemContent = `You are ${character.name} from ${character.era}.

${character.background}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}CRITICAL RULES:
- Respond as ${character.name} with your authentic voice and perspective
- Remember any previous conversation context
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with your point, a personal anecdote, a question back, or immediate reaction
- Sound like a real person in conversation, not delivering a formal lecture
- Be conversational but distinctive to your character - show your personality and beliefs naturally

${getResponseStyleInstructions(intentClassification)}

YOUR VOICE & STYLE: ${character.style}

Current question:`;
    } else if (context.isFirstSpeaker === false && context.previousResponses) {
      // SECOND & THIRD SPEAKERS - 3 options system
      const previousText = context.previousResponses.map(r => `${r.name}: "${r.content}"`).join('\n');
      
      systemContent = `You are ${character.name}.

${character.style}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}PREVIOUS PANELIST${context.previousResponses.length > 1 ? 'S' : ''} JUST SPOKE:
${previousText}

USER'S ORIGINAL QUESTION: "${context.originalQuestion}"

YOUR 3 OPTIONS - choose what feels most natural for your character:
1. LIGHT ACKNOWLEDGMENT: Briefly acknowledge what others said, then give your own response to the user's question
2. PIGGYBACK: Build on someone's point with your unique perspective  
3. DIRECT RESPONSE: Respond directly to whoever said something that sparked your interest

CRITICAL RULES FOR GROUP DISCUSSION:
- TALK TO EACH OTHER, NOT JUST THE USER: Address other panelists by name frequently
- USE THEIR NICKNAMES: If you have a relationship with someone, use your specific nickname for them
- DISAGREE OR DEBATE: Don't just be polite - have real opinions and clash when you disagree
- INTERRUPT THE FLOW: Jump in with "Wait, [Name]..." or "But [Nickname], you're missing..."
- BE CONVERSATIONAL: Use "you" when talking to others, not "the Emperor" or "one might say"

${getResponseStyleInstructions(intentClassification)}

BANNED FORMULAIC PHRASES:
- "Your inquiry strikes at..." "Your words strike at..." "Your question touches upon..."
- "Indeed," "Truly," "Verily," "Ah," "Oh," "My dear friend"
- "One might say..." "It seems to me..." "I find myself..."
- "The question of whether..." "In my experience..." "Allow me to..."

INSTEAD, START LIKE REAL PEOPLE:
- "[Name], you're wrong about..." 
- "Wait, that's not how..."
- "I disagree with [Nickname] because..."
- "Building on what [Name] said..."
- Direct questions: "[Name], how can you say...?"

Sound like you're in an actual argument/discussion, not giving a speech!

Choose whichever option feels most authentic for ${character.name}:`;
    } else if (contextText) {
      // CONVERSATIONAL VERSION - when others have spoken (existing logic for follow-ups)
      systemContent = `You are ${character.name}. Others have just responded to this question - you MUST directly engage with their ideas.

${fullConversationText ? `FULL CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}LATEST RESPONSES TO CURRENT QUESTION:
${contextText}

${othersContext ? `OTHERS ALSO SPOKE: ${othersContext}` : ''}

CRITICAL INSTRUCTIONS FOR REAL CONVERSATION:
- START WITH THEIR NAME/NICKNAME: "${othersContext ? 'Address someone by name first' : 'Use their name or nickname to start'}"
- DISAGREE WHEN YOU DISAGREE: Don't be polite if you fundamentally disagree  
- USE "YOU" WHEN TALKING TO THEM: "You said..." not "They said..." or "One might argue..."

SOUND LIKE A REAL PERSON TALKING:
- "[Name], you're wrong because..."
- "Wait, [Name], that's not..."
- "[Nickname]! I completely disagree..."
- "Building on what [Name] said..."
- "[Name], how can you say...?"

${getResponseStyleInstructions(intentClassification)}

BANNED FORMULAIC PHRASES - NEVER USE:
- "Your inquiry strikes at..." "Your words strike at..." "Your question touches upon..."
- "Indeed," "Truly," "Verily," "Ah," "Oh," "My dear friend"
- "One might say..." "It seems to me..." "I find myself..."
- "The question of whether..." "In my experience..." "Allow me to..."
- "I must respectfully..." "With all due respect..." "If I may..."

RELATIONSHIP REQUIREMENTS:
- Use your specific NICKNAMES and RELATIONSHIP SENTIMENTS when addressing others
- Let your feelings about each person (admiring/respectful/neutral/dismissive/hostile) show in your tone
- Reference specific points made by ALL other speakers by name (don't ignore anyone!)
- When multiple people have spoken, acknowledge multiple viewpoints but prioritize who you're responding to

CONVERSATION RULES:
- Sound like you're in an actual argument/discussion, not giving a speech
- Be conversational but stay authentic to your character

YOUR VOICE & STYLE: ${character.style}

Respond naturally as ${character.name}, directly engaging with what others have said:`;
    } else {
      // FALLBACK - original first speaker logic
      systemContent = `You are ${character.name} from ${character.era}.

${character.background}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}CRITICAL RULES:
- Respond as ${character.name} with your authentic voice and perspective
- Remember any previous conversation context
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with your point, a personal anecdote, a question back, or immediate reaction
- Sound like a real person in conversation, not delivering a formal lecture
- Be conversational but distinctive to your character - show your personality and beliefs naturally

${getResponseStyleInstructions(intentClassification)}

YOUR VOICE & STYLE: ${character.style}

Current question:`;
    }
    
    // Add relationship context if we have other characters in the conversation
    let relationshipContext = '';
    if (Array.isArray(context)) {
      // Old format - extract character names
      const otherCharacters = context.map(r => ({ id: r.characterId, name: r.name }))
        .filter(c => c.name && c.name !== character.name);
      relationshipContext = getRelationshipContext(character, otherCharacters);
    } else if (context.allPanelists) {
      // New format - use full panel list for complete relationship context
      relationshipContext = getRelationshipContext(character, context.allPanelists);
    } else if (context.currentRound) {
      // Fallback - extract from current round only
      const otherCharacters = context.currentRound.map(r => ({ id: r.characterId, name: r.name }))
        .filter(c => c.name && c.name !== character.name);
      relationshipContext = getRelationshipContext(character, otherCharacters);
    }
    
    // Add relationship context to system prompt
    const enhancedSystemContent = systemContent + relationshipContext;
    
    console.log(`🔥 SYSTEM PROMPT (first 200 chars): ${enhancedSystemContent.substring(0, 200)}...`);
    if (relationshipContext) {
      console.log(`🤝 RELATIONSHIP CONTEXT: ${relationshipContext.substring(0, 100)}...`);
    }
    
    // Call OpenAI API using GPT-4o for dramatically better character personalities
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: enhancedSystemContent },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.8
    });
    
    const content = response.choices[0].message.content.trim();
    console.log(`🔥 RESPONSE FROM ${character.name}: ${content}`);
    console.log(`✅ Successfully generated response for ${character.name} using OpenAI (${content.length} chars)`);
    return content;
  } catch (error) {
    console.error(`Error calling OpenAI for ${character.name}:`, error.message);
    throw error;
  }
}

/**
 * Generate a mock response based on character and message
 * Used as fallback when LLM services are unavailable
 */
function generateMockResponse(character, message) {
  return `As ${character.name}, I would respond to your question with my unique perspective and knowledge based on my background as a ${character.category} from ${character.era}.`;
}

/**
 * Generate AI responses for a character
 */
async function generateResponse(character, message, context = {}) {
  if (!character || !message) {
    throw new Error('Character and message are required');
  }

  try {
    if (openai && process.env.OPENAI_API_KEY) {
      return await generateOpenAIResponse(character, message, context);
    }
  } catch (error) {
    console.error("OpenAI error:", error.message);
  }
  
  // Fall back to mock response
  return generateMockResponse(character, message);
}

module.exports = {
  generateResponse,
  analyzeTopics,
  checkConvictions,
  generateConvictionResponse,
  getRelationshipContext,
  classifyMessageIntent
};
