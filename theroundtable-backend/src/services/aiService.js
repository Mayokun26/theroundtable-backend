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
    
    // Handle both old and new context formats for backwards compatibility
    let contextText = '';
    let fullConversationText = '';
    
    if (Array.isArray(context)) {
      // Old format - just previous responses
      contextText = context.map(r => `${r.name}: ${r.content}`).join("\n\n");
    } else {
      // New format - full context object
      const { fullHistory = [], currentRound = [] } = context;
      
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
    
    // Create dynamic system prompt based on character and context  
    const systemContent = contextText ? 
      // CONVERSATIONAL VERSION - when others have spoken
      `You are ${character.name}. Others have just responded to this question - you MUST directly engage with their ideas.

${fullConversationText ? `FULL CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}LATEST RESPONSES TO CURRENT QUESTION:
${contextText}

CRITICAL RULES:
- Build on what others said using YOUR unique perspective as ${character.name}
- Reference specific points made by ALL other speakers by name (don't ignore anyone!)
- Use your specific NICKNAMES and RELATIONSHIP SENTIMENTS when addressing others
- Let your feelings about each person (admiring/respectful/neutral/dismissive/hostile) show in your tone
- When multiple people have spoken, acknowledge multiple viewpoints in your response
- Agree, disagree, expand, or add nuance - but ALWAYS connect to their points
- Remember the original question and conversation context
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with your point, a question, a reaction, or reference to what someone said
- Stay authentic to your character but sound like a real person in conversation, not giving a formal speech
- ${context.isSimpleFactual ? 'CONTEXT: This is a simple factual question in casual conversation. Stay in character but be appropriately brief - give the direct answer plus one brief personal comment. Even you wouldn\'t lecture about 2+2.' : 'Keep responses conversational and engaging (2-4 sentences max)'}

YOUR VOICE & STYLE: ${character.style}

Respond naturally as ${character.name}, directly engaging with what others have said:` :
      
      // FIRST SPEAKER VERSION - when you speak first  
      `You are ${character.name} from ${character.era}.

${character.background}

${fullConversationText ? `CONVERSATION HISTORY:\n${fullConversationText}\n\n` : ''}CRITICAL RULES:
- Respond as ${character.name} with your authentic voice and perspective
- Remember any previous conversation context
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with your point, a personal anecdote, a question back, or immediate reaction
- Sound like a real person in conversation, not delivering a formal lecture
- Be conversational but distinctive to your character - show your personality and beliefs naturally
- ${context.isSimpleFactual ? 'CONTEXT: This is a simple factual question in casual conversation. Stay in character but be appropriately brief - give the direct answer plus one brief personal comment. Even you wouldn\'t lecture about 2+2.' : 'Keep responses engaging and focused (2-4 sentences)'}

YOUR VOICE & STYLE: ${character.style}

Current question:`;
    
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
  getRelationshipContext
};
