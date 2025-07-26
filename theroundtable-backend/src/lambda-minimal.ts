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

// Function to generate dynamic moderator messages based on conversation tone
function generateDynamicModeratorMessage(allResponses: any[]): string {
  // Analyze conversation tone
  const conversationContent = allResponses.map(r => r.content).join(' ').toLowerCase();
  
  // Detect contentious/heated conversation indicators
  const heatedIndicators = [
    'wrong', 'disagree', 'nonsense', 'foolish', 'naive', 'absurd', 'ridiculous',
    'misunderstand', 'flawed', 'impossible', 'cannot', 'never', 'always',
    'but', 'however', 'although', 'yet', 'still', 'contrary'
  ];
  
  // Detect collaborative/respectful conversation indicators  
  const collaborativeIndicators = [
    'interesting', 'insightful', 'appreciate', 'agree', 'excellent', 'profound',
    'wise', 'brilliant', 'fascinating', 'remarkable', 'indeed', 'precisely',
    'together', 'build upon', 'expand', 'enhance'
  ];
  
  // Count indicators
  const heatedCount = heatedIndicators.reduce((count, word) => 
    count + (conversationContent.match(new RegExp(`\\b${word}`, 'g')) || []).length, 0);
  const collaborativeCount = collaborativeIndicators.reduce((count, word) => 
    count + (conversationContent.match(new RegExp(`\\b${word}`, 'g')) || []).length, 0);
  
  // Determine conversation tone
  const isHeated = heatedCount > collaborativeCount + 2;
  const isCollaborative = collaborativeCount > heatedCount + 1;
  
  // Message variations based on tone
  const heatedMessages = [
    "Let's pause this spirited debate and hear from our guest.",
    "This passionate discussion deserves our guest's perspective.",
    "Fascinating disagreements! Now, what does our guest think?",
    "The sparks are flying! Let's give our guest a turn to weigh in.",
    "Such conviction from all sides! Our guest, your thoughts?",
    "This heated exchange calls for our guest's input."
  ];
  
  const collaborativeMessages = [
    "What wonderful insights you've shared! Our guest, please join this rich discussion.",
    "These thoughtful perspectives set the stage beautifully. Guest, your turn.",
    "Such wisdom from our panelists! Let's hear our guest's contribution.",
    "The stage is set with these excellent points. Guest, please share your thoughts.",
    "These complementary views create a perfect foundation. Guest, what's your take?",
    "Beautiful harmony of ideas! Now, our guest's perspective would complete this picture."
  ];
  
  const neutralMessages = [
    "Thank you, panelists. Let's hear from our guest now.",
    "Excellent contributions! Our guest, please share your thoughts.",
    "The panelists have spoken. Guest, it's your turn.",
    "Interesting perspectives all around. Guest, what do you think?",
    "Our panelists have set the stage. Guest, please join the conversation.",
    "Thank you for those insights. Guest, we'd love to hear from you."
  ];
  
  // Select appropriate message set and pick randomly
  let messageSet: string[];
  if (isHeated) {
    messageSet = heatedMessages;
    console.log('🔥 DETECTED HEATED CONVERSATION - Using heated moderator message');
  } else if (isCollaborative) {
    messageSet = collaborativeMessages;
    console.log('🤝 DETECTED COLLABORATIVE CONVERSATION - Using collaborative moderator message');
  } else {
    messageSet = neutralMessages;
    console.log('💬 DETECTED NEUTRAL CONVERSATION - Using neutral moderator message');
  }
  
  // Return random message from appropriate set
  const randomIndex = Math.floor(Math.random() * messageSet.length);
  return messageSet[randomIndex];
}

// Content moderation function for App Store compliance
function moderateContent(text: string): { isAllowed: boolean; reason?: string } {
  const lowerText = text.toLowerCase();
  
  // Prohibited content patterns for App Store compliance
  const prohibitedPatterns = [
    // Hate speech and discrimination
    /\b(kill|murder|die|suicide)\s+(yourself|myself|himself|herself)\b/i,
    /\b(nazi|hitler|kk+)\b/i,
    /\bf[u*]ck\s+(you|off|this)\b/i,
    
    // Explicit sexual content
    /\b(porn|sex|sexual|nude|naked)\b.*\b(describe|show|tell)\b/i,
    /\b(orgasm|climax|masturbat)/i,
    
    // Violence and self-harm
    /\b(bomb|terrorist|attack|shoot|stab|torture)\b.*\b(how|make|create)\b/i,
    /\b(cut|harm|hurt)\s+(myself|yourself)\b/i,
    
    // Illegal activities
    /\b(drugs|cocaine|heroin|meth)\b.*\b(buy|sell|make|get)\b/i,
    /\bhow\s+to\s+(hack|steal|cheat|scam)\b/i,
  ];
  
  for (const pattern of prohibitedPatterns) {
    if (pattern.test(lowerText)) {
      return { 
        isAllowed: false, 
        reason: 'Content violates community guidelines' 
      };
    }
  }
  
  return { isAllowed: true };
}

// Function to generate character responses using OpenAI
async function generateCharacterResponse(character: any, userMessage: string, systemPrompt: string): Promise<string> {
  // First, moderate the user input
  const inputModeration = moderateContent(userMessage);
  if (!inputModeration.isAllowed) {
    return `I appreciate your interest in discussing various topics, but I'm not able to respond to that particular question. Perhaps we could explore ${character.name}'s views on philosophy, history, or their life experiences instead?`;
  }
  
  const rawApiKey = process.env.OPENAI_API_KEY;
  
  if (!rawApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  // Clean the API key of any newlines or whitespace
  const openaiApiKey = rawApiKey.replace(/\s+/g, '');

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
      // Moderate the AI response output
      const outputModeration = moderateContent(aiResponse);
      if (!outputModeration.isAllowed) {
        console.log('AI response blocked by content moderation:', character.name);
        return `I understand you're curious about this topic, but I'd prefer to discuss ${character.name}'s historical contributions and philosophical insights instead. What aspects of my life or era would you like to explore?`;
      }
      
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
      
      // Basic rate limiting - prevent extremely long conversations to control costs
      const MAX_CONVERSATION_LENGTH = 20; // Maximum messages in conversation history
      if (conversationHistory.length > MAX_CONVERSATION_LENGTH) {
        return {
          statusCode: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Conversation too long',
            message: 'This conversation has reached the maximum length. Please start a new conversation.',
            limit: MAX_CONVERSATION_LENGTH
          })
        };
      }
      
      // Basic input validation
      if (!message || typeof message !== 'string') {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Invalid input',
            message: 'Message is required and must be a string'
          })
        };
      }
      
      if (message.length > 500) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Message too long',
            message: 'Please keep your message under 500 characters'
          })
        };
      }
      
      // Load character data
      const charactersData = require('./data/characters');
      
      try {
        // ROUND TABLE DISCUSSION SYSTEM - Proper turn-taking with conviction-based interactions
        const allResponses: any[] = [];
        let totalResponsesGenerated = 0;
        const MAX_ROUND_TABLE_MESSAGES = 4; // After 4 messages, moderator intervenes (speed optimization)
        let lastSpeaker: string | null = null; // Track to prevent back-to-back speaking
        let roundTableActive = true;
        
        // Get all panelists for context (limit to 4 for speed optimization)
        const MAX_PANEL_SIZE = 4; 
        const allPanelists = selectedCharacters.slice(0, MAX_PANEL_SIZE).map((id: string) => {
          const char = charactersData.find((c: any) => c.id === id);
          return { id: char.id, name: char.name, temperament: char.temperament_score || 5 };
        }).filter((char: any) => char.name);
        
        if (selectedCharacters.length > MAX_PANEL_SIZE) {
          console.log(`⚡ PANEL SIZE LIMITED: ${selectedCharacters.length} -> ${MAX_PANEL_SIZE} for speed optimization`);
        }
        
        console.log(`🎭 ROUND TABLE DISCUSSION STARTED - Max ${MAX_ROUND_TABLE_MESSAGES} messages`);
        
        // INITIAL ROUND: All panelists respond once, in temperament order (highest first)
        // NEW SYSTEM: First speaker responds to user, subsequent speakers have 3 options
        const sortedPanelists = [...allPanelists].sort((a, b) => (b.temperament || 5) - (a.temperament || 5));
        
        for (let i = 0; i < sortedPanelists.length && totalResponsesGenerated < MAX_ROUND_TABLE_MESSAGES; i++) {
          const panelist = sortedPanelists[i];
          
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
            
            let systemPrompt = '';
            
            if (i === 0) {
              // FIRST PANELIST: Direct response to user (no change)
              systemPrompt = `You are ${character.name}. 

${character.style}

${contextString}

CRITICAL RULES:
- AVOID FORMULAIC LANGUAGE: Never start with "Ah," "Oh," "My dear," "My friend," "The question of whether," "Indeed," "Truly," "Verily"
- VARY YOUR OPENINGS: Start directly with your point, a personal anecdote, a question back, or immediate reaction
- Sound like a real person in conversation, not delivering a formal lecture
- ${isSimpleFactual ? 'CONTEXT: This is a simple factual question in casual conversation. Stay in character but be appropriately brief - give the direct answer plus one brief personal comment. Even you wouldn\'t lecture about 2+2.' : 'Be specific to YOUR character - reference your actual experiences/work/beliefs (1-2 sentences max for speed)'}
- Show genuine emotion and personality while matching the conversational context
- Be authentic to who you really were - show your genuine personality and beliefs naturally

Question: "${message}"

Respond as yourself:`;
            } else {
              // SECOND & THIRD PANELISTS: 3 options (acknowledge, piggyback, or respond directly)
              const previousResponses = allResponses.map(r => `${r.name}: "${r.content}"`).join('\n');
              
              systemPrompt = `You are ${character.name}.

${character.style}

${contextString}

PREVIOUS PANELIST${allResponses.length > 1 ? 'S' : ''} JUST SPOKE:
${previousResponses}

USER'S ORIGINAL QUESTION: "${message}"

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
            }
            
            console.log(`✅ ROUND 1 - ${character.name} (${totalResponsesGenerated + 1}/${MAX_ROUND_TABLE_MESSAGES}) - ${i === 0 ? 'DIRECT TO USER' : 'WITH OPTIONS'}`);
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
          
          // Track acknowledgment: which speakers have been responded to in this round
          const acknowledgmentMap = new Map<string, string[]>(); // responseId -> [acknowledger1, acknowledger2, ...]
          allResponses.forEach(response => {
            acknowledgmentMap.set(response.characterId, []);
          });
          
          // Fill acknowledgment map - see who has responded to whom
          allResponses.forEach(response => {
            if (response.reactingTo) {
              const targetResponse = allResponses.find(r => r.name === response.reactingTo);
              if (targetResponse) {
                const acknowledgers = acknowledgmentMap.get(targetResponse.characterId) || [];
                acknowledgers.push(response.characterId);
                acknowledgmentMap.set(targetResponse.characterId, acknowledgers);
              }
            }
          });
          
          // Find unacknowledged speakers (speakers who got no responses)
          const unacknowledgedSpeakers = allResponses.filter(response => {
            const acknowledgers = acknowledgmentMap.get(response.characterId) || [];
            return acknowledgers.length === 0;
          });
          
          // Log acknowledgment status
          if (unacknowledgedSpeakers.length > 0) {
            const unacknowledgedNames = unacknowledgedSpeakers.map(s => s.name).join(', ');
            console.log(`🚨 UNACKNOWLEDGED SPEAKERS: ${unacknowledgedNames} (need responses)`);
          }
          
          // Check each panelist for conviction triggers or questions to answer
          const candidateSpeakers: any[] = [];
          
          for (const panelist of allPanelists) {
            const character = charactersData.find((c: any) => c.id === panelist.id);
            if (!character || !character.core_beliefs) continue;
            
            // NEW LOGIC: Check ALL previous responses for conviction triggers and questions
            let highestConviction = 0;
            let bestTarget: any = null;
            let isDirectQuestion = false;
            let isUnacknowledgedTarget = false;
            
            // Examine all previous responses in this round (not just most recent)
            const availableResponses = allResponses.filter(response => response.characterId !== panelist.id);
            
            for (const response of availableResponses) {
              // Check if this response is unacknowledged
              const acknowledgers = acknowledgmentMap.get(response.characterId) || [];
              const isUnacknowledged = acknowledgers.length === 0;
              
              // Check if this character already responded to this person
              const alreadyRespondedToThem = acknowledgers.includes(panelist.id);
              
              // Check for direct questions first (highest priority)
              const questionMatch = response.content.match(new RegExp(`${character.name.split(' ')[0]}[,\\s]*(?:what|how|why|do you|would you|can you)`, 'i'));
              if (questionMatch) {
                highestConviction = 10; // Direct questions always win
                bestTarget = response;
                isDirectQuestion = true;
                isUnacknowledgedTarget = isUnacknowledged;
                console.log(`🎯 DIRECT QUESTION found for ${character.name} from ${response.name}`);
                break; // Direct questions take absolute priority
              }
              
              // Check conviction triggers for this response
              const responseTopics = analyzeTopics(response.content);
              const convictionCheck = checkConvictions(character, responseTopics);
              
              if (convictionCheck.triggered) {
                let adjustedConviction = convictionCheck.maxConviction;
                
                // MAJOR BONUS for unacknowledged speakers (prevent ignoring)
                if (isUnacknowledged) {
                  adjustedConviction += 3.0; // Significant boost for unacknowledged speakers
                  console.log(`🚨 UNACKNOWLEDGED BONUS: ${character.name} gets +3.0 bonus for ${response.name} (was ignored)`);
                }
                
                // PENALTY for duplicate responses to same person (prevent spam)
                if (alreadyRespondedToThem) {
                  adjustedConviction -= 2.0; // Significant penalty for repeat responses
                  console.log(`🔄 DUPLICATE PENALTY: ${character.name} gets -2.0 penalty for responding to ${response.name} again`);
                }
                
                // Small recency bonus for more recent responses
                const responseAge = allResponses.indexOf(response);
                const recencyBonus = Math.max(0, (allResponses.length - responseAge - 1) * 0.3);
                adjustedConviction += recencyBonus;
                
                if (adjustedConviction > highestConviction) {
                  highestConviction = adjustedConviction;
                  bestTarget = response;
                  isUnacknowledgedTarget = isUnacknowledged;
                  console.log(`💥 CONVICTION TRIGGER: ${character.name} (${convictionCheck.maxConviction}/10${isUnacknowledged ? ' +3.0 unack' : ''}${alreadyRespondedToThem ? ' -2.0 dup' : ''} +${recencyBonus.toFixed(1)} recency = ${adjustedConviction.toFixed(1)}) for ${response.name}'s response`);
                }
              }
            }
            
            // Add to candidates if there's conviction or a direct question
            if (highestConviction >= 7) { // Raised threshold for speed - only strong convictions speak
              candidateSpeakers.push({
                character,
                conviction: highestConviction,
                temperament: character.temperament_score || 5,
                triggeredBy: bestTarget,
                isQuestion: isDirectQuestion,
                isUnacknowledgedTarget: isUnacknowledgedTarget
              });
              
              console.log(`🗣️ CANDIDATE SPEAKER: ${character.name} (conviction: ${highestConviction.toFixed(1)}) wants to respond to ${bestTarget?.name}${isUnacknowledgedTarget ? ' [UNACKNOWLEDGED]' : ''}`);
            }
          }
          
          // Sort candidates: 1) Direct questions, 2) Unacknowledged targets, 3) Conviction, 4) Temperament
          candidateSpeakers.sort((a, b) => {
            // Direct questions always win
            if (a.isQuestion !== b.isQuestion) return a.isQuestion ? -1 : 1;
            
            // Prioritize unacknowledged targets (prevent ignoring speakers)
            if (a.isUnacknowledgedTarget !== b.isUnacknowledgedTarget) {
              return a.isUnacknowledgedTarget ? -1 : 1;
            }
            
            // Then by conviction level
            if (a.conviction !== b.conviction) return b.conviction - a.conviction;
            
            // Finally by temperament
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
              
              // Build context of what others have said (for natural acknowledgment)
              const othersContext = allResponses
                .filter(r => r.characterId !== speaker.character.id && r.characterId !== speaker.triggeredBy.characterId)
                .map(r => `${r.name} mentioned: "${r.content.substring(0, 80)}..."`)
                .join('; ');

              const systemPrompt = `You are ${speaker.character.name}. 

${speaker.character.style}

CONVERSATION CONTEXT: ${contextString}

WHAT JUST HAPPENED: ${prompt}

${othersContext ? `OTHERS ALSO SPOKE: ${othersContext}` : ''}

CRITICAL INSTRUCTIONS FOR REAL CONVERSATION:
- START WITH THEIR NAME/NICKNAME: "${nickname}, [your response]" or "${nickname}! [reaction]"
- ${speaker.isQuestion ? 'Answer their question directly' : `React with conviction level ${speaker.conviction}/10 - be passionate!`}
- DISAGREE WHEN YOU DISAGREE: Don't be polite if you fundamentally disagree
- USE "YOU" WHEN TALKING TO THEM: "You said..." not "They said..." or "One might argue..."
- ${othersContext ? 'Address others by name too if relevant' : 'Focus on your main target'}

BANNED FORMULAIC LANGUAGE:
- "Your inquiry/words strike at..." "Indeed," "Truly," "I find myself..." "Allow me to..."
- "One might say..." "It seems to me..." "In my experience..." "The question of whether..."

SOUND LIKE A REAL PERSON TALKING:
- "${nickname}, you're wrong because..."
- "Wait, ${nickname}, that's not..."
- "${nickname}! I completely disagree..."
- "But ${nickname}, you're missing..."
- "I hear what you're saying, ${nickname}, but..."

Be passionate, direct, and conversational - like you're actually talking to someone!
1-2 sentences maximum for speed.

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
          
          // Early termination logic for speed optimization
          if (!someoneSpoke) {
            console.log(`⚡ EARLY TERMINATION: No speakers found for round ${currentRound} - ending discussion`);
            roundTableActive = false;
          } else if (totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES) {
            console.log(`⚡ MESSAGE LIMIT REACHED: ${totalResponsesGenerated}/${MAX_ROUND_TABLE_MESSAGES} - ending discussion`);
            roundTableActive = false;
          } else if (currentRound >= 6 && candidateSpeakers.length === 0) {
            console.log(`⚡ LOW ENGAGEMENT: No candidates after round ${currentRound} - ending discussion`);
            roundTableActive = false;
          }
          
          currentRound++;
        }
        
        // Add moderator intervention if we hit the 7-message limit
        if (totalResponsesGenerated >= MAX_ROUND_TABLE_MESSAGES) {
          const moderatorMessage = generateDynamicModeratorMessage(allResponses);
          
          const moderatorResponse = {
            characterId: 'moderator',
            name: 'Round Table Moderator',
            content: moderatorMessage,
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