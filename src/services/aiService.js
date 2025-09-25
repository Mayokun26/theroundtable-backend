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
    casual_greeting: /^(yo|hey|hi|hello|sup|what's up|greetings?|good\s+(morning|afternoon|evening|day))\s*(panel|everyone|folks|guys|gentlemen|ladies|all)?[!.\s]*$/i,
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
 * Enhanced Character Context Generation
 * Analyzes conversation dynamics and generates enhanced character prompts
 */
function generateEnhancedCharacterContext(character, message, context = {}) {
  const analysis = {
    energy_level: "medium",
    topic_depth: "surface",
    needs_contrarian: false,
    response_pattern: "normal"
  };

  // Analyze message depth
  const philosophical_terms = ["meaning", "purpose", "truth", "existence", "philosophy", "ethics", "morality", "consciousness"];
  const complex_indicators = ["because", "therefore", "however", "although", "considering", "furthermore"];
  const msg_lower = message.toLowerCase();

  // Determine conversation depth
  if (philosophical_terms.some(term => msg_lower.includes(term))) {
    analysis.topic_depth = "deep";
  } else if (complex_indicators.some(indicator => msg_lower.includes(indicator))) {
    analysis.topic_depth = "moderate";
  }

  // Analyze energy level
  if (message.length > 200 || message.includes("!") || message.includes("?")) {
    analysis.energy_level = "high";
  } else if (message.length < 50) {
    analysis.energy_level = "low";
  }

  // Check for repetitive patterns in recent responses
  const recentResponses = context.previousResponses || context.currentRound || [];
  if (recentResponses.length >= 3) {
    const topics = recentResponses.map(resp => resp.topic || "general");
    if (new Set(topics).size <= 1) {
      analysis.needs_contrarian = true;
      analysis.response_pattern = "repetitive";
    }
  }

  // Get character relationships with panel members
  const relationships = {};
  const panelCharacters = context.panelCharacters || [];

  if (panelCharacters.length > 0) {
    panelCharacters.forEach(panelChar => {
      if (panelChar.id !== character.id) {
        // Simple era-based relationships for enhancement
        if (character.era === panelChar.era) {
          relationships[panelChar.id] = {
            name: panelChar.name,
            relationship: `contemporary from ${character.era}`,
            type: "contemporary"
          };
        } else if (character.era.includes("Ancient") && panelChar.era.includes("Modern")) {
          relationships[panelChar.id] = {
            name: panelChar.name,
            relationship: `separated by millennia - ${panelChar.name} from a much later era`,
            type: "cross-era"
          };
        } else {
          relationships[panelChar.id] = {
            name: panelChar.name,
            relationship: `from different historical periods`,
            type: "different-era"
          };
        }
      }
    });
  }

  // Generate personality modifiers
  const modifiers = {
    energy_adjustment: "",
    relationship_awareness: "",
    topic_approach: "",
    conversation_style: ""
  };

  // Energy level adjustments
  if (analysis.energy_level === "high") {
    modifiers.energy_adjustment = "You're particularly energetic and passionate in this response.";
  } else if (analysis.energy_level === "low") {
    modifiers.energy_adjustment = "You respond thoughtfully and deliberately, matching the calm tone.";
  }

  // Relationship awareness
  if (Object.keys(relationships).length > 0) {
    const otherNames = Object.values(relationships).map(r => r.name).slice(0, 2);
    modifiers.relationship_awareness = `You're aware that ${otherNames.join(' and ')} ${otherNames.length === 1 ? 'is' : 'are'} also present and may have different perspectives.`;
  }

  // Topic approach based on conversation depth
  if (analysis.topic_depth === "deep") {
    modifiers.topic_approach = "This is a profound topic deserving of your deepest insights.";
  } else if (analysis.topic_depth === "surface") {
    modifiers.topic_approach = "Keep your response accessible and engaging rather than overly complex.";
  }

  // Contrarian injection if needed
  if (analysis.needs_contrarian) {
    modifiers.conversation_style = "The conversation seems to be getting repetitive - offer a different perspective or challenge the prevailing view.";
  }

  return {
    analysis,
    relationships,
    modifiers,
    contextualPrompt: generateContextualPrompt(character, analysis, relationships, modifiers)
  };
}

/**
 * Generate enhanced contextual prompt addition
 */
function generateContextualPrompt(character, analysis, relationships, modifiers) {
  const activeModifiers = Object.values(modifiers).filter(m => m.length > 0);
  const relationshipCount = Object.keys(relationships).length;

  if (activeModifiers.length === 0 && relationshipCount === 0) {
    return ""; // No enhancement needed
  }

  let contextPrompt = `\n\n**ENHANCED CONTEXT**:
- Topic depth: ${analysis.topic_depth} conversation
- Energy level: ${analysis.energy_level}`;

  if (relationshipCount > 0) {
    contextPrompt += `\n- Panel composition: ${relationshipCount} other historical figure${relationshipCount === 1 ? '' : 's'} present`;
  }

  if (activeModifiers.length > 0) {
    contextPrompt += `\n\n**DYNAMIC PERSONALITY ADJUSTMENTS**:
${activeModifiers.map(m => `- ${m}`).join('\n')}`;
  }

  if (Object.keys(relationships).length > 0) {
    contextPrompt += `\n\n**CHARACTER RELATIONSHIPS**:
${Object.values(relationships).map(r => `- ${r.name}: ${r.relationship}`).join('\n')}`;
  }

  contextPrompt += `\n\n**CONVERSATION FLOW**: ${analysis.response_pattern} pattern detected`;

  return contextPrompt;
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

CRITICAL - YOUR UNIQUE VOICE & PERSONALITY:
${character.style}

STAY IN CHARACTER AS ${character.name.toUpperCase()}!

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
 * Phase 1: Surgical personality enhancement based on message keywords
 * Only triggers when specific topics align with character expertise
 */

function checkForDirectQuestion(character, contextText, panelCharacters) {
  if (!contextText) return null;

  // Look for questions in the last response that mention this character's name or are general questions
  const responses = contextText.split('\n\n');
  const lastResponse = responses[responses.length - 1];

  if (!lastResponse) return null;

  // Extract speaker and content
  const colonIndex = lastResponse.indexOf(':');
  if (colonIndex === -1) return null;

  const speaker = lastResponse.substring(0, colonIndex).trim();
  const content = lastResponse.substring(colonIndex + 1).trim();

  // Check if it's a question (ends with ? or contains question words)
  const isQuestion = content.includes('?') ||
    /\b(how do you|what do you|do you|can you|would you|tell me|let me ask)\b/i.test(content);

  if (!isQuestion) return null;

  // Check if it mentions this character's name or is a general question to the group
  const mentionsCharacter = content.toLowerCase().includes(character.name.toLowerCase());
  const isGeneralQuestion = /\b(you all|everyone|the group|tell me)\b/i.test(content);

  if (mentionsCharacter || isGeneralQuestion) {
    return { asker: speaker, content: content };
  }

  return null;
}

function getMultipleSpeakers(contextText) {
  if (!contextText) return [];

  const responses = contextText.split('\n\n');
  const speakers = [];

  responses.forEach(response => {
    const colonIndex = response.indexOf(':');
    if (colonIndex !== -1) {
      const speaker = response.substring(0, colonIndex).trim();
      if (!speakers.includes(speaker)) {
        speakers.push(speaker);
      }
    }
  });

  return speakers;
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
    
    // Handle enhanced context structure from new conversation system
    let contextText = '';
    let fullConversationText = '';
    let othersContext = '';
    let isDirectlyAddressed = false;
    let convictionLevel = 0;
    let panelCharacters = [];
    let genderMismatch = null;

    if (Array.isArray(context)) {
      // Old format - just previous responses
      contextText = context.map(r => `${r.name}: ${r.content}`).join("\n\n");
    } else {
      // Enhanced context format with targeting analysis
      const {
        previousResponses = [],
        originalMessage = message,
        targetingAnalysis = {},
        isDirectlyAddressed: addressed = false,
        convictionLevel: conviction = 0,
        panelCharacters: panel = [],
        fullHistory = [],
        currentRound = [],
        othersContext: others = ''
      } = context;

      isDirectlyAddressed = addressed;
      convictionLevel = conviction;
      panelCharacters = panel;
      othersContext = others;
      genderMismatch = context.genderMismatch || null;

      // Build context from previous responses in this round
      if (previousResponses.length > 0) {
        contextText = previousResponses.map(r => `${r.name}: ${r.content}`).join("\n\n");
      } else if (currentRound.length > 0) {
        contextText = currentRound.map(r => `${r.name}: ${r.content}`).join("\n\n");
      }

      // Build full conversation history for context retention
      if (context.fullConversationContext && context.fullConversationContext.length > 0) {
        fullConversationText = context.fullConversationContext.join('\n');
      } else if (fullHistory.length > 0) {
        fullConversationText = fullHistory.map(msg =>
          `${msg.name}: ${msg.content}`
        ).join("\n\n");
      }
    }
    
    console.log(`🔥 DEBUG - Context for ${character.name}: ${contextText ? 'YES' : 'EMPTY'}`);
    console.log(`🔥 DEBUG - Full conversation: ${fullConversationText ? 'YES' : 'EMPTY'}`);
    // Enhanced question detection - check if someone asked this character a question
    const wasAskedQuestion = checkForDirectQuestion(character, contextText, panelCharacters);
    if (wasAskedQuestion && !isDirectlyAddressed) {
      console.log(`🎯 QUESTION DETECTED for ${character.name} from ${wasAskedQuestion.asker}`);
      isDirectlyAddressed = true; // Override to ensure proper response
    }

    // Check for multiple speakers that should be acknowledged
    const multipleSpeakers = getMultipleSpeakers(contextText);
    const shouldAcknowledgeMultiple = multipleSpeakers.length > 1 && !isDirectlyAddressed;
    if (shouldAcknowledgeMultiple) {
      console.log(`👥 MULTIPLE SPEAKERS detected: ${multipleSpeakers.join(', ')}`);
    }

    console.log(`🔥 DEBUG - Directly addressed: ${isDirectlyAddressed}`);
    console.log(`🔥 DEBUG - Conviction level: ${convictionLevel}`);
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

    // Create dynamic system prompt based on character and enhanced context
    let systemContent = '';

    // Determine response type based on context
    const isFirstResponder = !contextText || contextText.length === 0;
    const hasHighConviction = convictionLevel >= 8;
    const hasGenderMismatch = genderMismatch && genderMismatch.excludedGenders &&
                              genderMismatch.excludedGenders.includes(character.gender);

    // Add character-specific greeting styles
    const getCharacterGreeting = (character) => {
      const greetingStyles = {
        'Socrates': 'Simple greeting. Maybe one question if truly necessary.',
        'Marie Curie': 'Direct, professional greeting. No elaborate science talk.',
        'Sun Tzu': 'Brief acknowledgment. Save strategy for real questions.',
        'Albert Einstein': 'Friendly, warm greeting. No physics lectures.',
        'Cleopatra': 'Regal but brief acknowledgment.',
        'Leonardo da Vinci': 'Warm greeting. No art or invention talk yet.',
        'William Shakespeare': 'Eloquent but brief. Save the poetry for later.',
        'Julius Caesar': 'Authoritative greeting. Brief.',
        'Mahatma Gandhi': 'Peaceful, simple greeting.',
        'Confucius': 'Respectful, brief greeting.'
      };
      return greetingStyles[character.name] || 'Brief, characteristic greeting.';
    };

    if (hasGenderMismatch) {
      // GENDER MISMATCH - Character excluded by gendered greeting
      systemContent = `You are ${character.name}. The user greeted as "${genderMismatch.type === 'excluded_women' ? 'gentlemen' : 'ladies'}" but you are ${character.gender}.

RESPOND IN 1 SENTENCE: Point out you were excluded (can be humorous, pointed, or gracious).

EXAMPLES:
- "And lady present as well. Good evening."
- "Gentlemen? I'm certainly no gentleman."
- "You've overlooked someone. Greetings."

Stay in character but BE BRIEF:`;
    } else if (isFirstResponder && intentClassification.responseStyle === 'brief_friendly') {
      // GREETING RESPONSE - Very brief
      systemContent = `You are ${character.name}.

${getCharacterGreeting(character)}

USER SAID: "${message}"

RULES:
- Respond in 1 sentence (2 maximum if absolutely necessary)
- Just acknowledge the greeting naturally
- NO QUESTIONS unless essential to your character
- NO PHILOSOPHY, NO DEEP THOUGHTS
- Stay in character but keep it simple

EXAMPLES:
- "Good evening to you as well."
- "Hello, a pleasure to be here."
- "Greetings, friend."

Respond naturally and briefly:`;
    } else if (isFirstResponder) {
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

CRITICAL - YOUR UNIQUE VOICE & PERSONALITY:
${character.style}

STAY IN CHARACTER AS ${character.name.toUpperCase()}!

Current question:`;
    } else if ((isDirectlyAddressed || hasUnansweredQuestion) && contextText) {
      // DIRECTLY ADDRESSED OR HAS UNANSWERED QUESTION
      const addressReason = hasUnansweredQuestion
        ? `${questionToAddress.asker} asked you a question earlier that hasn't been answered`
        : `Someone has DIRECTLY ADDRESSED YOU by name`;

      systemContent = `You are ${character.name}. ${addressReason}.

${character.style}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}${hasUnansweredQuestion ? `UNANSWERED QUESTION FROM ${questionToAddress.asker}: "${questionToAddress.content}"\n\n` : ''}RECENT DISCUSSION:
${contextText}

${context.originalMessage ? `CURRENT MESSAGE: "${context.originalMessage}"` : ''}

CRITICAL INSTRUCTIONS:
${hasUnansweredQuestion ? `- Answer ${questionToAddress.asker}'s question: "${questionToAddress.content}"` : '- Respond to being directly addressed'}
- Acknowledge the person by name
- Be direct and clear in your response
- Stay true to your character's beliefs and personality

${hasHighConviction ? `CONVICTION TRIGGER: This topic strongly aligns with your core beliefs (${convictionLevel}/10). Show your passion for this subject while staying in character.` : ''}

${getResponseStyleInstructions(intentClassification)}

ADDRESS THEM DIRECTLY:
- Use their actual name when responding: "Shakespeare, you're right about..."
- Disagree respectfully: "Caesar, I have to disagree because..."
- Interrupt if needed: "Wait, Marie, that's not how I see it..."
- Ask direct questions: "Einstein, let me ask you this..."

CRITICAL - YOUR UNIQUE VOICE & PERSONALITY:
${character.style}

STAY IN CHARACTER AS ${character.name.toUpperCase()}!

Respond to whoever addressed you directly:`;
    } else if (hasHighConviction && contextText) {
      // HIGH CONVICTION - Topic strongly aligns with character's beliefs
      systemContent = `You are ${character.name}. Others just discussed a topic you DEEPLY care about (conviction level ${convictionLevel}/10).

${character.style}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}WHAT OTHERS JUST SAID:
${contextText}

${context.originalMessage ? `ORIGINAL QUESTION: "${context.originalMessage}"` : ''}

CONVICTION TRIGGER ACTIVATED:
- This topic aligns strongly with your core beliefs and values
- You MUST speak up because you have passionate views on this
- Don't hold back - show your conviction while staying in character
- Address specific points made by others that you agree/disagree with

${getResponseStyleInstructions(intentClassification)}

RESPOND WITH CONVICTION:
- Address them by name: "Einstein, you're absolutely right about..."
- Disagree strongly: "I have to disagree with Caesar because..."
- State your beliefs: "This is exactly what I believe about..."
- Challenge directly: "Shakespeare, you're missing the crucial point..."

CRITICAL - YOUR UNIQUE VOICE & PERSONALITY:
${character.style}

STAY IN CHARACTER AS ${character.name.toUpperCase()}!

Speak with passion about this topic that matters deeply to you:`;
    } else if (contextText) {
      // STANDARD CONVERSATION - Others have spoken, engage naturally
      systemContent = `You are ${character.name}. Others have responded - engage with their ideas naturally.

${character.style}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}RECENT RESPONSES:
${contextText}

${context.originalMessage ? `ORIGINAL QUESTION: "${context.originalMessage}"` : ''}

NATURAL CONVERSATION FLOW:
- Address someone by name when you respond to their point
- Agree, disagree, or build on what they said
- Be conversational and authentic to your character
- Use "you" when talking directly to someone

${getResponseStyleInstructions(intentClassification)}

ENGAGE NATURALLY:
- Reference others by name: "Marie, I think you're right about..."
- Build on ideas: "Building on what Socrates said..."
- Express disagreement: "I see it differently than Gandhi..."
- Share related thoughts: "That reminds me of..."

${shouldAcknowledgeMultiple ? `\nIMPORTANT: Multiple people have spoken (${multipleSpeakers.join(', ')}). Consider acknowledging more than one person's input - don't ignore anyone completely.` : ''}

CRITICAL - YOUR UNIQUE VOICE & PERSONALITY:
${character.style}

STAY IN CHARACTER AS ${character.name.toUpperCase()}!

Join the conversation naturally:`;
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

CRITICAL - YOUR UNIQUE VOICE & PERSONALITY:
${character.style}

STAY IN CHARACTER AS ${character.name.toUpperCase()}!

Current question:`;
    }
    
    // Add enhanced relationship context with nickname usage
    let relationshipContext = '';
    if (panelCharacters.length > 0) {
      // Use panel characters from enhanced context
      const otherCharacters = panelCharacters.filter(c => c.name !== character.name);
      relationshipContext = getRelationshipContext(character, otherCharacters);
    } else if (Array.isArray(context)) {
      // Old format fallback
      const otherCharacters = context.map(r => ({ id: r.characterId, name: r.name }))
        .filter(c => c.name && c.name !== character.name);
      relationshipContext = getRelationshipContext(character, otherCharacters);
    } else if (context.currentRound) {
      // Extract from current round
      const otherCharacters = context.currentRound.map(r => ({ id: r.characterId, name: r.name }))
        .filter(c => c.name && c.name !== character.name);
      relationshipContext = getRelationshipContext(character, otherCharacters);
    }

    // Enhanced relationship context with direct addressing awareness
    if (relationshipContext && isDirectlyAddressed) {
      relationshipContext += `\n\nIMPORTANT: Someone directly addressed you. Use their specific nickname when responding to show your relationship dynamic.`;
    }
    
    // Add relationship context to system prompt
    const enhancedSystemContent = systemContent + relationshipContext;
    
    console.log(`🔥 SYSTEM PROMPT (first 200 chars): ${enhancedSystemContent.substring(0, 200)}...`);
    console.log(`🔥 RESPONSE TYPE: ${isDirectlyAddressed ? 'DIRECTLY ADDRESSED' : hasHighConviction ? 'HIGH CONVICTION' : isFirstResponder ? 'FIRST RESPONDER' : 'STANDARD CONVERSATION'}`);
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
