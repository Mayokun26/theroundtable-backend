import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as https from 'https';

// Function to parse user targeting from message
function parseCharacterTargeting(message: string, characters: any[]): string[] {
  const messageLower = message.toLowerCase();
  const targetedCharacters: string[] = [];
  
  // Extract first few words to check for character names
  const words = messageLower.split(/[,\s]+/).slice(0, 8); // Increased to 8 words for better coverage
  
  for (const character of characters) {
    const nameLower = character.name.toLowerCase();
    const nameParts = nameLower.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    
    // Check for various targeting patterns
    const isTargeted = words.some(word => {
      if (word.length < 3) return false;
      
      // Direct name match
      if (nameLower.includes(word) || word.includes(firstName)) return true;
      
      // Fuzzy matching for common misspellings
      if (firstName.startsWith(word.substring(0, 3))) return true;
      if (word.startsWith(firstName.substring(0, 3))) return true;
      
      // Last name matching
      if (nameParts.length > 1 && (lastName.includes(word) || word.includes(lastName))) return true;
      
      return false;
    });
    
    // Additional check for multi-word names (like "Sun Tzu")
    if (!isTargeted && nameParts.length > 1) {
      const consecutiveWords = [];
      for (let i = 0; i < words.length - 1; i++) {
        consecutiveWords.push(words[i] + ' ' + words[i + 1]);
      }
      
      const isConsecutiveMatch = consecutiveWords.some(phrase => 
        nameLower.includes(phrase) || phrase.includes(nameLower)
      );
      
      if (isConsecutiveMatch) {
        targetedCharacters.push(character.id);
        continue;
      }
    }
    
    if (isTargeted) {
      targetedCharacters.push(character.id);
    }
  }
  
  return targetedCharacters;
}

// Function to calculate response order based on targeting and relevance
function calculateResponseOrder(message: string, characters: any[], targetedCharacters: string[]): { primary: string[], secondary: string[] } {
  const allCharacterIds = characters.map(c => c.id);
  
  if (targetedCharacters.length > 0) {
    // Targeted characters respond first, others are secondary
    const nonTargeted = allCharacterIds.filter(id => !targetedCharacters.includes(id));
    return {
      primary: targetedCharacters,
      secondary: nonTargeted
    };
  }
  
  // General question - all respond as primary, none as secondary initially
  return {
    primary: allCharacterIds,
    secondary: []
  };
}

// Function to determine if a character should interact with another's response
function shouldCharacterInteract(
  character: any, 
  primaryResponse: any, 
  userMessage: string,
  characters: any[]
): boolean {
  // Don't interact with your own response
  if (character.id === primaryResponse.id) return false;
  
  const messageLower = userMessage.toLowerCase();
  const responseContentLower = primaryResponse.content.toLowerCase();
  
  // Check for topic overlap based on categories
  const topicOverlap = character.category === characters.find(c => c.id === primaryResponse.id)?.category;
  
  // Check for era proximity (similar time periods might interact)
  const characterEra = character.era?.toLowerCase() || '';
  const primaryEra = characters.find(c => c.id === primaryResponse.id)?.era?.toLowerCase() || '';
  const eraProximity = characterEra.includes('ancient') && primaryEra.includes('ancient') ||
                      characterEra.includes('medieval') && primaryEra.includes('medieval') ||
                      characterEra.includes('renaissance') && primaryEra.includes('renaissance');
  
  // Check for historical relationships (we'll enhance this)
  const hasHistoricalConnection = checkHistoricalConnection(character.name, characters.find(c => c.id === primaryResponse.id)?.name);
  
  // Check for disagreement opportunities based on categories
  const disagreementPotential = (character.category === 'Military Leader' && primaryResponse.content.includes('strategy')) ||
                               (character.category === 'Philosopher' && (messageLower.includes('truth') || messageLower.includes('meaning'))) ||
                               (character.category === 'Scientist' && (messageLower.includes('evidence') || messageLower.includes('method')));
  
  // Interaction scoring - more aggressive
  let score = 0;
  if (topicOverlap) score += 0.5;
  if (eraProximity) score += 0.4;
  if (hasHistoricalConnection) score += 0.7;
  if (disagreementPotential) score += 0.6;
  
  // Base interaction chance - everyone should have some chance to interact
  score += 0.2;
  
  // Random factor to add variety
  score += Math.random() * 0.3;
  
  return score > 0.3; // Lower threshold for more interactions
}

// Function to check historical relationships (basic version)
function checkHistoricalConnection(name1: string, name2: string): boolean {
  const relationships: { [key: string]: string[] } = {
    'Socrates': ['Plato'],
    'Plato': ['Socrates', 'Aristotle'],
    'Aristotle': ['Plato', 'Alexander the Great'],
    'Alexander the Great': ['Aristotle'],
    'Julius Caesar': ['Cleopatra'],
    'Cleopatra': ['Julius Caesar'],
    'Napoleon Bonaparte': ['Frederick the Great'],
    'Frederick the Great': ['Napoleon Bonaparte']
  };
  
  return relationships[name1]?.includes(name2) || relationships[name2]?.includes(name1) || false;
}

// Function to generate character responses using OpenAI
async function generateCharacterResponse(character: any, userMessage: string, systemPrompt: string): Promise<string> {
  const rawApiKey = process.env.OPENAI_API_KEY || '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';
  // Clean the API key of any newlines or whitespace
  const openaiApiKey = rawApiKey.replace(/\s+/g, '');
  
  if (!openaiApiKey) {
    // Fallback to character-aware mock responses if no API key
    return generateMockResponse(character, userMessage);
  }

  try {
    console.log('Making OpenAI API call for character:', character.name);
    console.log('Using API key (first 10 chars):', openaiApiKey.substring(0, 10));
    
    const requestBody = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 450, // Increased for richer character responses
      temperature: 0.7
    });

    const response = await new Promise<any>((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });

    console.log('OpenAI response status:', response.statusCode);
    
    if (response.statusCode !== 200) {
      console.error('OpenAI API error details:', response.body);
      throw new Error(`OpenAI API error: ${response.statusCode} - ${response.body}`);
    }

    const data = JSON.parse(response.body);
    console.log('OpenAI response data:', JSON.stringify(data, null, 2));
    
    const aiResponse = data.choices[0]?.message?.content;
    if (aiResponse) {
      console.log('Successfully got AI response for', character.name);
      return aiResponse;
    } else {
      console.log('No AI response, falling back to mock');
      return generateMockResponse(character, userMessage);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    console.log('Falling back to mock response for', character.name);
    return generateMockResponse(character, userMessage);
  }
}

// Fallback function for historically authentic mock responses
function generateMockResponse(character: any, userMessage: string): string {
  const responses = {
    'Socrates': `My friend, you speak of "${userMessage}". But tell me, what is the true nature of this matter? For I know that I know nothing, and perhaps through our dialogue we may examine this question together. What do you truly mean when you speak of such things?`,
    'Marie Curie': `Good day. Your inquiry regarding "${userMessage}" reminds me of the methodical approach required in my laboratory. Through careful observation and persistent scientific inquiry, we may understand the fundamental properties of such matters. What observations have you made?`,
    'Leonardo da Vinci': `Salve, my friend. Your words of "${userMessage}" call to mind my studies of the natural world. In my observations of anatomy and mechanics, I have seen that all things are connected by divine patterns. How might this relate to the flow of water or the flight of birds?`,
    'Albert Einstein': `Guten Tag. Your question touches upon something fundamental about our universe. In my work on relativity, I have learned that imagination is more important than knowledge, for knowledge is limited. How do you envision this matter in the grand scheme of spacetime?`,
    'William Shakespeare': `Good morrow to thee, gentle soul. Thy words regarding "${userMessage}" do stir within me thoughts most profound. Methinks this matter touches upon the very essence of the human condition, as all the world's a stage. What dreams may come from such contemplation?`,
    'Julius Caesar': `Ave, citizen. Your words reach the ears of one who has crossed the Rubicon and commanded the legions of Rome. In matters of "${userMessage}", strategy and decisive action are paramount. What counsel do you seek from Caesar?`,
    'Mahatma Gandhi': `Namaste, my friend. Your question about "${userMessage}" brings to mind my lifelong pursuit of truth and non-violence. Through satyagraha, we learn that all suffering arises from within. How might we find peace in such matters?`
  };

  return responses[character.name as keyof typeof responses] || 
    `As ${character.name} from ${character.era}, I must consider your question about "${userMessage}" through the lens of my historical experience and wisdom from my time period.`;
}

// Minimal Lambda handler - no Express, no heavy dependencies
export const handler = async (
  event: any,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Get request details from API Gateway v2 event
    const method = event.requestContext?.http?.method || 'GET';
    let path = event.rawPath || '/';
    
    // Remove stage prefix if present (e.g., /dev/health -> /health)
    if (path.startsWith('/dev/')) {
      path = path.substring(4);
    }
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // If empty after processing, set to root
    if (path === '') path = '/';
    
    console.log('Method:', method, 'Original Path:', event.rawPath, 'Processed Path:', path);
    
    // Simple routing
    if (path === '/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          path: path,
          method: method
        })
      };
    }
    
    if (path === '/characters' && method === 'GET') {
      // Load actual character data
      const charactersData = require('./data/characters');
      
      // Fix image URLs to use placeholder service for now
      const charactersWithImages = charactersData.map((char: any) => ({
        ...char,
        imageUrl: `https://via.placeholder.com/200x200/4a5568/ffffff?text=${encodeURIComponent(char.name)}`
      }));
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ data: charactersWithImages })
      };
    }
    
    if (path === '/conversations' && method === 'POST') {
      // Handle conversation requests
      const body = event.body ? JSON.parse(event.body) : {};
      const { message = '', characters: selectedCharacters = [], conversationHistory = [] } = body;
      
      // Load character data
      const charactersData = require('./data/characters');
      
      try {
        // ROUND TABLE DISCUSSION SYSTEM - Proper turn-taking with conviction-based interactions
        const allResponses: any[] = [];
        let totalResponsesGenerated = 0;
        const MAX_ROUND_TABLE_MESSAGES = 5; // After 5 messages, moderator intervenes
        let lastSpeaker: string | null = null; // Track to prevent back-to-back speaking
        let roundTableActive = true;
        
        // Get all panelists for context
        const allPanelists = selectedCharacters.map((id: string) => {
          const char = charactersData.find((c: any) => c.id === id);
          return { id: char.id, name: char.name, temperament: char.temperament_score || 5 };
        }).filter((char: any) => char.name);
        
        console.log(`🎭 ROUND TABLE DISCUSSION STARTED - Max ${MAX_ROUND_TABLE_MESSAGES} messages`);
        
        // INITIAL ROUND: All panelists respond once, in temperament order (highest first)
        const sortedPanelists = [...allPanelists].sort((a, b) => (b.temperament || 5) - (a.temperament || 5));
        
        for (const panelist of sortedPanelists) {
          if (totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES) break;
          
          try {
            const character = charactersData.find((c: any) => c.id === panelist.id);
            if (!character) continue;
            
            // Create full conversation context for this character
            const fullConversationContext = [];
            
            // Add conversation history (user messages and AI responses)
            if (conversationHistory.length > 0) {
              fullConversationContext.push("FULL CONVERSATION:");
              conversationHistory.forEach((entry: any) => {
                fullConversationContext.push(`${entry.speaker}: ${entry.message}`);
              });
            }
            
            // Add current round responses
            if (allResponses.length > 0) {
              fullConversationContext.push("\nCURRENT ROUND:");
              allResponses.forEach(r => {
                fullConversationContext.push(`${r.name}: ${r.content}`);
              });
            }
            
            const contextString = fullConversationContext.length > 0 ? `\n\n${fullConversationContext.join('\n')}\n` : '';
            
            // Check if this is a simple factual question that warrants brief responses
            const isSimpleFactual = /^(what\s+(is\s+)?(\d+\s*[\+\-\*\/]\s*\d+|\d+[\+\-\*\/]\d+)|(\d+\s*[\+\-\*\/]\s*\d+)|count\s+to\s+\d+|what.s\s+\d+\s*[\+\-\*\/]\s*\d+)(\?)?$/i.test(message.trim());
            
            const systemPrompt = `You are ${character.name}. 

${character.style}

${contextString}

${allResponses.length > 0 ? `Others in this discussion: ${allResponses.map(r => r.name).join(', ')}\n\nRespond with YOUR unique perspective.` : ''}

CRITICAL RULES:
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with your point, a personal anecdote, a question back, or immediate reaction
- Sound like a real person in conversation, not delivering a formal lecture
- ${isSimpleFactual ? 'CONTEXT: This is a simple factual question in casual conversation. Stay in character but be appropriately brief - give the direct answer plus one brief personal comment. Even you wouldn\'t lecture about 2+2.' : 'Be specific to YOUR character - reference your actual experiences/work/beliefs (2-3 sentences max)'}
- Show genuine emotion and personality while matching the conversational context
- Be authentic to who you really were - show your genuine personality and beliefs naturally

Question: "${message}"

Respond as yourself:`;
            
            console.log(`✅ ROUND 1 - ${character.name} (${totalResponsesGenerated + 1}/7)`);
            const content = await generateCharacterResponse(character, message, systemPrompt);
            
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
            
          } catch (error) {
            console.error(`Error generating response for character ${panelist.id}:`, error);
          }
        }
        
        // Helper functions for conviction checking
        function analyzeTopics(text: string): string[] {
          const lowerText = text.toLowerCase();
          const words = lowerText.split(/\s+|[.,!?;:]/)
            .map(word => word.replace(/[^\w]/g, ''))
            .filter(word => word.length > 1); // Allow shorter words like "god", "art", "war"
          
          // Extract meaningful phrases for multi-word topics
          const phrases: string[] = [];
          const commonPhrases = [
            'divine mission', 'philosopher king', 'cave allegory', 'eternal truth', 'ideal state',
            'scientific method', 'non violence', 'civil rights', 'human nature', 'free will',
            'social justice', 'natural law', 'moral virtue', 'higher purpose', 'greater good',
            'inner peace', 'spiritual journey', 'life purpose', 'moral duty', 'ethical principle',
            'sacred duty', 'holy mission', 'righteous cause', 'noble purpose', 'divine calling'
          ];
          
          commonPhrases.forEach(phrase => {
            if (lowerText.includes(phrase)) {
              phrases.push(phrase.replace(/\s+/g, '_')); // Convert to single token
            }
          });
          
          const allTopics = [...words, ...phrases];
          console.log(`🔍 ANALYZED TOPICS: ${allTopics.slice(0, 15).join(', ')}${allTopics.length > 15 ? '...' : ''}`);
          return allTopics;
        }
        
        function checkConvictions(character: any, topics: string[]): { triggered: boolean; maxConviction: number; reasons: any[] } {
          if (!character.core_beliefs && !character.topic_convictions) {
            return { triggered: false, maxConviction: 0, reasons: [] };
          }
          
          let maxConviction = 0;
          const triggeredBeliefs: any[] = [];
          
          console.log(`🔍 LAMBDA CHECKING CONVICTIONS for ${character.name}`);
          console.log(`🔍 Topics to analyze: ${topics.slice(0, 10).join(', ')}...`);
          
          // Check core beliefs triggers with enhanced matching
          if (character.core_beliefs) {
            character.core_beliefs.forEach((belief: any) => {
              if (belief.triggers) {
                const matchedTriggers = belief.triggers.filter((trigger: string) => {
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
                  maxConviction = Math.max(maxConviction, belief.conviction || 0);
                  triggeredBeliefs.push({
                    statement: belief.statement,
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
            Object.entries(character.topic_convictions).forEach(([topic, conviction]: [string, any]) => {
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
                triggeredBeliefs.push({
                  statement: `Strong feelings about ${topic}`,
                  conviction: conviction,
                  triggers: [topic]
                });
                console.log(`✅ TOPIC CONVICTION TRIGGERED: "${topic}" (${conviction}/10)`);
              }
            });
          }
          
          const result = {
            triggered: maxConviction >= 8, // Threshold for triggering responses
            maxConviction,
            reasons: triggeredBeliefs
          };
          
          if (result.triggered) {
            console.log(`🔥 CONVICTION TRIGGERED for ${character.name}: ${result.maxConviction}/10`);
          } else {
            console.log(`❌ NO CONVICTION TRIGGERED for ${character.name}: max ${result.maxConviction}/10`);
          }
          
          return result;
        }
        
        // FOLLOW-UP ROUNDS: Conviction-based reactions and questions
        let currentRound = 2;
        while (totalResponsesGenerated < MAX_ROUND_TABLE_MESSAGES && roundTableActive) {
          let someoneSpoke = false;
          
          // Check each panelist for conviction triggers or questions to answer
          const candidateSpeakers: any[] = [];
          
          for (const panelist of allPanelists) {
            if (panelist.id === lastSpeaker) continue; // No back-to-back speaking
            
            const character = charactersData.find((c: any) => c.id === panelist.id);
            if (!character || !character.core_beliefs) continue;
            
            // PRIORITY 1: Check for direct questions or high conviction triggers from the MOST RECENT response
            const lastResponse = allResponses[allResponses.length - 1];
            let highestConviction = 0;
            let triggeredBy: any = null;
            let questionedBy: any = null;
            
            if (lastResponse && lastResponse.characterId !== panelist.id) {
              // Check for direct questions in most recent response
              const questionMatch = lastResponse.content.match(new RegExp(`${character.name.split(' ')[0]}[,\\s]*(?:what|how|why|do you|would you|can you)`, 'i'));
              if (questionMatch) {
                questionedBy = lastResponse;
                highestConviction = 10; // Direct questions get highest priority
              } else {
                // Check conviction triggers from most recent response
                const responseTopics = analyzeTopics(lastResponse.content);
                const convictionCheck = checkConvictions(character, responseTopics);
                
                if (convictionCheck.triggered) {
                  highestConviction = convictionCheck.maxConviction;
                  triggeredBy = lastResponse;
                }
              }
            }
            
            // PRIORITY 2: If no strong reaction to most recent, check last 2 responses for high conviction (9+)
            if (highestConviction < 9 && !questionedBy) {
              const recentResponses = allResponses.slice(-2, -1); // Second and third most recent
              
              for (const recentResponse of recentResponses) {
                if (recentResponse.characterId === panelist.id) continue;
                
                const responseTopics = analyzeTopics(recentResponse.content);
                const convictionCheck = checkConvictions(character, responseTopics);
                
                if (convictionCheck.triggered && convictionCheck.maxConviction > highestConviction && convictionCheck.maxConviction >= 9) {
                  highestConviction = convictionCheck.maxConviction;
                  triggeredBy = recentResponse;
                }
              }
            }
            
            // PRIORITY 3: Natural follow-up opportunity - lower threshold for most recent response
            if (!triggeredBy && !questionedBy && lastResponse && lastResponse.characterId !== panelist.id) {
              const responseTopics = analyzeTopics(lastResponse.content);
              const convictionCheck = checkConvictions(character, responseTopics);
              
              if (convictionCheck.triggered && convictionCheck.maxConviction >= 6) {
                highestConviction = convictionCheck.maxConviction + 2; // Boost for recency
                triggeredBy = lastResponse;
              }
            }
            
            // Add to candidates if there's any reason to speak
            if (highestConviction >= 6 || questionedBy) {
              candidateSpeakers.push({
                character,
                conviction: highestConviction,
                temperament: character.temperament_score || 5,
                triggeredBy: triggeredBy || questionedBy,
                isQuestion: !!questionedBy
              });
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
              
              let prompt: string;
              let responseType = '';
              
              if (speaker.isQuestion) {
                prompt = `${nickname} just asked you: "${speaker.triggeredBy.content}". Respond directly to their question.`;
                responseType = 'answer';
              } else {
                prompt = `REACT to what ${nickname} just said: "${speaker.triggeredBy.content}". This triggers your core beliefs with conviction level ${speaker.conviction}/10.`;
                responseType = 'reaction';
              }
              
              // Create full conversation context
              const fullConversationContext = [];
              
              // Add conversation history (user messages and AI responses)
              if (conversationHistory.length > 0) {
                fullConversationContext.push("FULL CONVERSATION:");
                conversationHistory.forEach((entry: any) => {
                  fullConversationContext.push(`${entry.speaker}: ${entry.message}`);
                });
              }
              
              // Add current round responses
              if (allResponses.length > 0) {
                fullConversationContext.push("\nCURRENT ROUND:");
                allResponses.forEach(r => {
                  fullConversationContext.push(`${r.name}: ${r.content}`);
                });
              }
              
              const contextString = fullConversationContext.length > 0 ? `\n\n${fullConversationContext.join('\n')}\n` : '';
              
              const systemPrompt = `You are ${speaker.character.name}. 

${speaker.character.style}

CONVERSATION CONTEXT: ${contextString}

WHAT JUST HAPPENED: ${prompt}

CRITICAL INSTRUCTIONS:
- You're responding directly to ${nickname} who just spoke
- Address them by your nickname for them: "${nickname}, [your response]"
- ${speaker.isQuestion ? 'Answer their question directly' : `React with conviction level ${speaker.conviction}/10`}
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with their nickname and your reaction, or jump straight into your point
- Be authentic to your character and show genuine emotion - sound like a real person reacting
- Build on what they said - agree, disagree, or expand their point naturally
- React authentically as your character would - show your genuine beliefs and personality
- 2-3 substantial sentences maximum

Respond to ${speaker.triggeredBy.name} now:`;
              
              const content = await generateCharacterResponse(speaker.character, prompt, systemPrompt);
              
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
              
              console.log(`🔥 ROUND ${currentRound} - ${speaker.character.name} ${responseType.toUpperCase()} (${totalResponsesGenerated}/${MAX_ROUND_TABLE_MESSAGES})`);
            } catch (error) {
              console.error(`Error generating reaction/answer for ${speaker.character.name}:`, error);
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
            content: `Thank you panelists, please give our guest a chance to speak.`,
            timestamp: new Date().toISOString(),
            isModerator: true
          };
          
          allResponses.push(moderatorResponse);
          console.log(`🎙️ MODERATOR INTERVENTION: Discussion concluded after ${totalResponsesGenerated} messages`);
        }
        
        console.log(`🎭 ROUND TABLE DISCUSSION COMPLETE: ${totalResponsesGenerated} total responses generated`);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            responses: allResponses,
            roundTableComplete: totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES
          })
        };
      } catch (error) {
        console.error('Error generating responses:', error);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Failed to generate responses' })
        };
      }
    }
    
    // Handle OPTIONS requests for CORS preflight
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400'
        },
        body: ''
      };
    }
    
    // Default 404 response
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Not found',
        path: path,
        method: method,
        availableRoutes: ['/health', '/characters']
      })
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};