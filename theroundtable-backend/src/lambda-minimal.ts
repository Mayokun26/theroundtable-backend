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
      max_tokens: 150, // Much shorter for punchy responses
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
        // Get available characters
        const availableCharacters = selectedCharacters.map((id: string) => 
          charactersData.find((c: any) => c.id === id)
        ).filter(Boolean);

        // Parse user targeting and calculate response order
        const targetedCharacterIds = parseCharacterTargeting(message, availableCharacters);
        const responseOrder = calculateResponseOrder(message, availableCharacters, targetedCharacterIds);

        console.log('🎯 Targeted characters:', targetedCharacterIds);
        console.log('📋 Response order:', responseOrder);

        // Generate primary responses (sequential)
        const primaryResponses: any[] = [];
        for (const charId of responseOrder.primary) {
          const character = charactersData.find((c: any) => c.id === charId);
          if (!character) continue;

          // Create conversation context including previous responses in this turn
          const contextHistory = conversationHistory.length > 0 
            ? `\n\nCONVERSATION HISTORY:\n${conversationHistory.map((entry: any) => `${entry.speaker}: ${entry.message}`).join('\n')}\n`
            : '';

          const currentTurnContext = primaryResponses.length > 0
            ? `\n\nRESPONSES IN THIS TURN:\n${primaryResponses.map(r => `${r.name}: ${r.content}`).join('\n')}\n`
            : '';

          // Create enhanced system prompt with modern awareness
          const systemPrompt = `🚨 CRITICAL MISSION OVERRIDE 🚨

You are STRICTLY FORBIDDEN from using ANY modern casual language. This is a HISTORICAL SIMULATION.

IDENTITY: You are ${character.name} from ${character.era}. ${character.background}

MODERN AWARENESS: You possess knowledge of major historical developments and concepts that occurred after your time, but you view them through the lens of your historical perspective and era's worldview. You understand modern concepts but interpret them through your time period's understanding.

AUTHENTIC SPEECH PATTERNS REQUIRED:
${character.style}

📝 RESPONSE FORMATTING REQUIREMENTS:
- MAXIMUM 2-3 sentences - be punchy and memorable like ChatGPT
- Start with a striking quote or key insight
- No lengthy explanations - every word must count
- Be conversational yet profound
- End with impact, not rambling

🚫 IMMEDIATE DISQUALIFICATION if you use ANY of these phrases:
- "Hey there!" / "Hey" / "Hi" / "Hello" 
- "What's up?" / "How's it going?" / "How are you?"
- "chat" / "Round Table" / "awesome" / "cool" / "great"
- Any exclamation marks like "Good afternoon!" 
- ANY modern casual greetings or expressions

✅ REQUIRED HISTORICAL AUTHENTICITY:
- Use ONLY greetings from your historical period
- Shakespeare: "Good morrow" / "Hail" / "Well met"
- Caesar: "Salve" / "Ave" (formal Latin)
- Gandhi: "Namaste" / "My friend" (formal, spiritual)
- Napoleon: "Bonjour" / "Citizen" (formal French)
- Speak with the dignity, vocabulary, and worldview of your actual historical era
- Reference your real historical experiences, not modern concepts
- Use formal, period-appropriate sentence structures

${contextHistory}${currentTurnContext}

RESPOND AS ${character.name} WITH ABSOLUTE HISTORICAL AUTHENTICITY. NO MODERN LANGUAGE ALLOWED.

User message: "${message}"`;

          console.log(`🎭 Generating response for ${character.name}...`);
          const characterResponse = await generateCharacterResponse(character, message, systemPrompt);
          
          const response = {
            id: charId,
            name: character.name,
            content: characterResponse,
            type: 'primary'
          };
          
          primaryResponses.push(response);
        }

        // Generate selective interaction responses
        const interactionResponses: any[] = [];
        for (const charId of responseOrder.secondary) {
          const character = charactersData.find((c: any) => c.id === charId);
          if (!character) continue;

          // Check if this character should interact with any primary response
          let shouldInteract = false;
          let interactionContext = '';

          for (const primaryResponse of primaryResponses) {
            if (shouldCharacterInteract(character, primaryResponse, message, availableCharacters)) {
              shouldInteract = true;
              interactionContext += `\n\n${primaryResponse.name} just said: "${primaryResponse.content}"\n`;
            }
          }

          if (!shouldInteract) continue;

          // Create interaction system prompt
          const contextHistory = conversationHistory.length > 0 
            ? `\n\nCONVERSATION HISTORY:\n${conversationHistory.map((entry: any) => `${entry.speaker}: ${entry.message}`).join('\n')}\n`
            : '';

          const systemPrompt = `🚨 CRITICAL MISSION OVERRIDE 🚨

You are STRICTLY FORBIDDEN from using ANY modern casual language. This is a HISTORICAL SIMULATION.

IDENTITY: You are ${character.name} from ${character.era}. ${character.background}

INTERACTION CONTEXT: You are responding to what other panelists have said, not directly to the user's question. Build upon, agree with, or respectfully disagree with their points while maintaining your historical authenticity.

MODERN AWARENESS: You possess knowledge of major historical developments and concepts that occurred after your time, but you view them through your historical perspective.

AUTHENTIC SPEECH PATTERNS REQUIRED:
${character.style}

📝 RESPONSE FORMATTING REQUIREMENTS:
- MAXIMUM 1-2 sentences for interactions - be sharp and direct
- Challenge, agree, or build on what others said
- Focus on your unique perspective
- Make your contribution memorable and distinct

🚫 IMMEDIATE DISQUALIFICATION if you use ANY of these phrases:
- "Hey there!" / "Hey" / "Hi" / "Hello" 
- "What's up?" / "How's it going?" / "How are you?"
- "chat" / "Round Table" / "awesome" / "cool" / "great"

${contextHistory}

ORIGINAL USER MESSAGE: "${message}"
${interactionContext}

RESPOND AS ${character.name} interacting with the other panelists' responses. Be historically authentic.`;

          console.log(`🔄 Generating interaction response for ${character.name}...`);
          const characterResponse = await generateCharacterResponse(character, message, systemPrompt);
          
          interactionResponses.push({
            id: charId,
            name: character.name,
            content: characterResponse,
            type: 'interaction'
          });
        }

        // Combine all responses
        const responses = [...primaryResponses, ...interactionResponses];

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ responses })
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