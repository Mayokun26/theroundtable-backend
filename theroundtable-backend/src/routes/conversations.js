const express = require('express');
const router = express.Router();
const { generateResponse, analyzeTopics, checkConvictions, generateConvictionResponse } = require('../services/aiService');
const characters = require('../data/characters');

// In-memory store for conversations (in a real app, this would be a database)
const conversations = {};

// Generate a simple UUID for conversation IDs
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Helper function to get character data
function getCharacterData(characterId) {
  return characters.find(c => c.id === characterId) || null;
}

// POST - Create a new conversation or add message to existing one
router.post('/', async (req, res) => {
  try {
    const { message, characterIds, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!characterIds || !Array.isArray(characterIds) || characterIds.length === 0) {
      return res.status(400).json({ error: 'At least one character ID is required' });
    }
    
    // Validate all character IDs
    const invalidCharacters = characterIds.filter(id => !getCharacterData(id));
    if (invalidCharacters.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid character IDs provided', 
        invalidIds: invalidCharacters 
      });
    }
    
    // Get or create conversation
    let conversation;
    if (conversationId && conversations[conversationId]) {
      conversation = conversations[conversationId];
    } else {
      const newId = generateId();
      conversations[newId] = {
        id: newId,
        messages: [],
        characterIds: characterIds,
        createdAt: new Date().toISOString()
      };
      conversation = conversations[newId];
    }
    
    // Add user message to history
    conversation.messages.push({
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Get complete conversation history for context (including user messages for better context)
    const conversationHistory = conversation.messages.map(msg => {
      if (msg.sender === 'user') {
        return { name: 'User', content: msg.content, isUser: true };
      } else {
        return { 
          characterId: msg.characterId,
          name: msg.name, 
          content: msg.content,
          isUser: false 
        };
      }
    });
    
    // Get just AI responses for character interaction
    const allPreviousResponses = conversation.messages
      .filter(msg => msg.sender !== 'user')
      .map(msg => ({
        characterId: msg.characterId,
        name: msg.name,
        content: msg.content
      }));
    
    // ROUND TABLE DISCUSSION SYSTEM - Proper turn-taking with conviction-based interactions
    const allResponses = [];
    let totalResponsesGenerated = 0;
    const MAX_ROUND_TABLE_MESSAGES = 7; // After 7 messages, moderator intervenes
    let lastSpeaker = null; // Track to prevent back-to-back speaking
    let roundTableActive = true;
    
    // Get all panelists for context
    const allPanelists = characterIds.map(id => {
      const char = getCharacterData(id);
      return { id: char.id, name: char.name, temperament: char.temperament_score || 5 };
    }).filter(char => char.name);
    
    console.log(`🎭 ROUND TABLE DISCUSSION STARTED - Max ${MAX_ROUND_TABLE_MESSAGES} messages`);
    
    // INITIAL ROUND: All panelists respond once, in temperament order (highest first)
    // NEW SYSTEM: First speaker responds to user, subsequent speakers have 3 options
    const sortedPanelists = [...allPanelists].sort((a, b) => (b.temperament || 5) - (a.temperament || 5));
    
    for (let i = 0; i < sortedPanelists.length && totalResponsesGenerated < MAX_ROUND_TABLE_MESSAGES; i++) {
      const panelist = sortedPanelists[i];
      
      try {
        const character = getCharacterData(panelist.id);
        if (!character) continue;
        
        // Create full conversation context
        const fullConversationContext = [];
        
        // Add conversation history (user messages and AI responses)
        if (conversationHistory.length > 0) {
          fullConversationContext.push("FULL CONVERSATION:");
          conversationHistory.forEach((entry) => {
            fullConversationContext.push(`${entry.name || entry.speaker}: ${entry.content || entry.message}`);
          });
        }
        
        // Add current round responses
        if (allResponses.length > 0) {
          fullConversationContext.push("\nCURRENT ROUND:");
          allResponses.forEach(r => {
            fullConversationContext.push(`${r.name}: ${r.content}`);
          });
        }
        
        // Check if this is a simple factual question that warrants brief responses
        const isSimpleFactual = /^(what\s+(is\s+)?(\d+\s*[\+\-\*\/]\s*\d+|\d+[\+\-\*\/]\d+)|(\d+\s*[\+\-\*\/]\s*\d+)|count\s+to\s+\d+|what.s\s+\d+\s*[\+\-\*\/]\s*\d+)(\?)?$/i.test(message.trim());
        
        console.log(`📜 EXPRESS ROUTE - Processing ${character.name} for message: "${message.slice(0, 50)}..."`);
        
        let contextForThisCharacter;
        
        if (i === 0) {
          // FIRST PANELIST: Direct response to user (existing logic)
          contextForThisCharacter = {
            fullHistory: conversationHistory,
            currentRound: allResponses,
            originalQuestion: message,
            allPanelists: allPanelists.filter(p => p.id !== panelist.id),
            fullConversationContext: fullConversationContext,
            isSimpleFactual: isSimpleFactual,
            isFirstSpeaker: true
          };
        } else {
          // SECOND & THIRD PANELISTS: 3 options system
          const previousResponses = allResponses.map(r => ({
            name: r.name,
            content: r.content
          }));
          
          contextForThisCharacter = {
            fullHistory: conversationHistory,
            currentRound: allResponses,
            originalQuestion: message,
            allPanelists: allPanelists.filter(p => p.id !== panelist.id),
            fullConversationContext: fullConversationContext,
            isSimpleFactual: isSimpleFactual,
            isFirstSpeaker: false,
            previousResponses: previousResponses,
            speakerIndex: i
          };
        }
        
        const content = await generateResponse(character, message, contextForThisCharacter);
        
        const response = {
          characterId: panelist.id,
          name: character.name,
          content,
          timestamp: new Date().toISOString(),
          round: 1,
          responseNumber: totalResponsesGenerated + 1
        };
        
        allResponses.push(response);
        totalResponsesGenerated++;
        lastSpeaker = panelist.id;
        
        // Add to conversation history
        conversation.messages.push({
          sender: 'ai',
          characterId: panelist.id,
          name: character.name,
          content,
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ ROUND 1 - ${character.name} (${totalResponsesGenerated}/${MAX_ROUND_TABLE_MESSAGES}): ${content.substring(0, 100)}...`);
      } catch (error) {
        console.error(`Error generating response for character ${panelist.id}:`, error);
      }
    }
    
    // FOLLOW-UP ROUNDS: Conviction-based reactions and questions
    let currentRound = 2;
    while (totalResponsesGenerated < MAX_ROUND_TABLE_MESSAGES && roundTableActive) {
      let someoneSpoke = false;
      
      // Check each panelist for conviction triggers or questions to answer
      const candidateSpeakers = [];
      
      for (const panelist of allPanelists) {
        // Allow back-to-back speaking for meaningful conversations - remove the restriction
        // if (panelist.id === lastSpeaker) continue;
        
        const character = getCharacterData(panelist.id);
        if (!character || !character.core_beliefs) continue;
        
        // NEW LOGIC: Check ALL previous responses for conviction triggers and questions
        let highestConviction = 0;
        let bestTarget = null;
        let isDirectQuestion = false;
        
        // Examine all previous responses in this round (not just most recent)
        const availableResponses = allResponses.filter(response => response.characterId !== panelist.id);
        
        for (const response of availableResponses) {
          // Check for direct questions first (highest priority)
          const questionMatch = response.content.match(new RegExp(`${character.name.split(' ')[0]}[,\\s]*(?:what|how|why|do you|would you|can you)`, 'i'));
          if (questionMatch) {
            highestConviction = 10; // Direct questions always win
            bestTarget = response;
            isDirectQuestion = true;
            console.log(`🎯 EXPRESS: DIRECT QUESTION found for ${character.name} from ${response.name}`);
            break; // Direct questions take absolute priority
          }
          
          // Check conviction triggers for this response
          const responseTopics = analyzeTopics(response.content);
          const convictionCheck = checkConvictions(character, responseTopics);
          
          if (convictionCheck.triggered) {
            let adjustedConviction = convictionCheck.maxConviction;
            
            // Slight recency bonus for more recent responses (but not overwhelming)
            const responseAge = allResponses.indexOf(response);
            const recencyBonus = Math.max(0, (allResponses.length - responseAge - 1) * 0.5);
            adjustedConviction += recencyBonus;
            
            if (adjustedConviction > highestConviction) {
              highestConviction = adjustedConviction;
              bestTarget = response;
              console.log(`💥 EXPRESS: CONVICTION TRIGGER: ${character.name} (${convictionCheck.maxConviction}/10 + ${recencyBonus.toFixed(1)} recency) for ${response.name}'s response`);
            }
          }
        }
        
        // Add to candidates if there's conviction or a direct question
        if (highestConviction >= 6) { // Lower threshold since we're being smarter about targeting
          candidateSpeakers.push({
            character,
            conviction: highestConviction,
            temperament: character.temperament_score || 5,
            triggeredBy: bestTarget,
            isQuestion: isDirectQuestion
          });
          
          console.log(`🗣️ EXPRESS: CANDIDATE SPEAKER: ${character.name} (conviction: ${highestConviction.toFixed(1)}) wants to respond to ${bestTarget?.name}`);
        }
      }
      
      // Sort candidates by conviction level, then temperament
      candidateSpeakers.sort((a, b) => {
        if (a.conviction !== b.conviction) return b.conviction - a.conviction;
        return b.temperament - a.temperament;
      });
      
      // Let the highest-priority candidate speak
      if (candidateSpeakers.length > 0 && totalResponsesGenerated < MAX_ROUND_TABLE_MESSAGES) {
        const speaker = candidateSpeakers[0];
        
        try {
          // Get the nickname this character uses for the person they're responding to
          const targetCharacterId = speaker.triggeredBy.characterId;
          const nickname = speaker.character.relationships?.[targetCharacterId]?.nickname || speaker.triggeredBy.name;
          
          let prompt;
          let responseType = '';
          
          if (speaker.isQuestion) {
            prompt = `${nickname} just asked you: "${speaker.triggeredBy.content}". Respond directly to their question.`;
            responseType = 'answer';
          } else {
            prompt = `REACT to what ${nickname} just said: "${speaker.triggeredBy.content}". This triggers your core beliefs with conviction level ${speaker.conviction}/10.`;
            responseType = 'reaction';
          }
          
          // Create full conversation context for reaction
          const fullConversationContext = [];
          
          // Add conversation history (user messages and AI responses)
          if (conversationHistory.length > 0) {
            fullConversationContext.push("FULL CONVERSATION:");
            conversationHistory.forEach((entry) => {
              fullConversationContext.push(`${entry.name || entry.speaker}: ${entry.content || entry.message}`);
            });
          }
          
          // Add current round responses
          if (allResponses.length > 0) {
            fullConversationContext.push("\nCURRENT ROUND:");
            allResponses.forEach(r => {
              fullConversationContext.push(`${r.name}: ${r.content}`);
            });
          }
          
          // Build context of what others have said (for natural acknowledgment)
          const othersContext = allResponses
            .filter(r => r.characterId !== speaker.character.id && r.characterId !== speaker.triggeredBy.characterId)
            .map(r => `${r.name} mentioned: "${r.content.substring(0, 80)}..."`)
            .join('; ');

          const contextForReaction = {
            fullHistory: conversationHistory,
            currentRound: allResponses,
            originalQuestion: message,
            allPanelists: allPanelists.filter(p => p.id !== speaker.character.id),
            fullConversationContext: fullConversationContext,
            nickname: nickname,
            reactionPrompt: prompt,
            othersContext: othersContext
          };
          
          const content = await generateResponse(speaker.character, prompt, contextForReaction);
          
          const response = {
            characterId: speaker.character.id,
            name: speaker.character.name,
            content,
            timestamp: new Date().toISOString(),
            round: currentRound,
            responseNumber: totalResponsesGenerated + 1,
            isReaction: responseType === 'reaction',
            isAnswer: responseType === 'answer',
            reactingTo: speaker.triggeredBy.name,
            convictionLevel: speaker.conviction
          };
          
          allResponses.push(response);
          totalResponsesGenerated++;
          lastSpeaker = speaker.character.id;
          someoneSpoke = true;
          
          // Add to conversation history
          conversation.messages.push({
            sender: 'ai',
            characterId: speaker.character.id,
            name: speaker.character.name,
            content,
            timestamp: new Date().toISOString(),
            isReaction: responseType === 'reaction',
            isAnswer: responseType === 'answer'
          });
          
          console.log(`🔥 ROUND ${currentRound} - ${speaker.character.name} ${responseType.toUpperCase()} (${totalResponsesGenerated}/7): ${content.substring(0, 100)}...`);
        } catch (error) {
          console.error(`Error generating ${responseType} for ${speaker.character.name}:`, error);
        }
      }
      
      // If no one spoke or we're at the limit, end the round table
      if (!someoneSpoke || totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES) {
        roundTableActive = false;
      }
      
      currentRound++;
    }
    
    // Add moderator intervention if we hit the 7-message limit
    if (totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES) {
      const moderatorResponse = {
        characterId: 'moderator',
        name: 'Round Table Moderator',
        content: `The panelists have had their discussion (${totalResponsesGenerated} exchanges). Let's give you a chance to respond to what you've heard.`,
        timestamp: new Date().toISOString(),
        isModerator: true
      };
      
      allResponses.push(moderatorResponse);
      
      conversation.messages.push({
        sender: 'ai',
        characterId: 'moderator',
        name: 'Round Table Moderator',
        content: moderatorResponse.content,
        timestamp: new Date().toISOString(),
        isModerator: true
      });
      
      console.log(`🎙️ MODERATOR INTERVENTION: Discussion concluded after ${totalResponsesGenerated} messages`);
    }
    
    console.log(`🎭 ROUND TABLE DISCUSSION COMPLETE: ${totalResponsesGenerated} total responses generated`);
    
    console.log(`✅ GENERATED ${allResponses.length} round table responses`);
    
    res.status(200).json({
      conversationId: conversation.id,
      responses: allResponses,
      roundTableComplete: totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES
    });
  } catch (error) {
    console.error('Error in conversation handler:', error);
    res.status(500).json({ error: 'Failed to process conversation' });
  }
});

// GET - Retrieve conversation history
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const conversation = conversations[id];
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  res.status(200).json(conversation);
});

module.exports = router; 