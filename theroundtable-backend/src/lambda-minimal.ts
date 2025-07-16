import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as https from 'https';

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
      max_tokens: 600,
      temperature: 0.6
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
        const allResponses = await Promise.all(
          selectedCharacters.map(async (charId: string) => {
            const character = charactersData.find((c: any) => c.id === charId);
            if (!character) {
              return {
                id: charId,
                name: 'Unknown Character',
                content: 'I apologize, but I could not find information about this character.'
              };
            }

            // Check if this character should respond (simple partial matching)
            const messageLower = message.toLowerCase();
            const nameLower = character.name.toLowerCase();
            const firstWord = messageLower.split(/[,\s]+/)[0]; // Get first word, handle commas
            
            // Simple matching with better fuzzy logic
            const firstName = nameLower.split(' ')[0]; // Get first part of character name
            const isAddressed = (firstWord.length > 2) && (
              nameLower.includes(firstWord) || 
              firstWord.includes(firstName) ||
              firstName.includes(firstWord) ||
              // Better fuzzy matching: check if firstWord is a reasonable prefix/substring of firstName
              (firstWord.length >= 3 && firstName.startsWith(firstWord.substring(0, 3))) ||
              // Handle single character differences (malcom vs malcolm)
              (Math.abs(firstWord.length - firstName.length) <= 1 && 
               firstName.startsWith(firstWord.substring(0, Math.min(firstWord.length, firstName.length) - 1)))
            );
            
            // Check if ANY character is addressed in the message (using same improved fuzzy logic)
            const anyCharacterAddressed = selectedCharacters.some((id: string) => {
              const char = charactersData.find((c: any) => c.id === id);
              if (!char) return false;
              const charNameLower = char.name.toLowerCase();
              const charFirstName = charNameLower.split(' ')[0];
              return (firstWord.length > 2) && (
                charNameLower.includes(firstWord) || 
                firstWord.includes(charFirstName) ||
                charFirstName.includes(firstWord) ||
                // Better fuzzy matching: check if firstWord is a reasonable prefix/substring of charFirstName
                (firstWord.length >= 3 && charFirstName.startsWith(firstWord.substring(0, 3))) ||
                // Handle single character differences (malcom vs malcolm)
                (Math.abs(firstWord.length - charFirstName.length) <= 1 && 
                 charFirstName.startsWith(firstWord.substring(0, Math.min(firstWord.length, charFirstName.length) - 1)))
              );
            });
            
            // Only respond if:
            // 1. This character is directly addressed, OR
            // 2. No character is addressed (general question)
            if (!isAddressed && anyCharacterAddressed) {
              return null; // This character won't respond - someone else was addressed
            }

            // Create conversation context
            const contextHistory = conversationHistory.length > 0 
              ? `\n\nCONVERSATION HISTORY:\n${conversationHistory.map((entry: any) => `${entry.speaker}: ${entry.message}`).join('\n')}\n`
              : '';

            // Create a historically authentic personality prompt for the character
            const systemPrompt = `🚨 CRITICAL MISSION OVERRIDE 🚨

You are STRICTLY FORBIDDEN from using ANY modern casual language. This is a HISTORICAL SIMULATION.

IDENTITY: You are ${character.name} from ${character.era}. ${character.background}

AUTHENTIC SPEECH PATTERNS REQUIRED:
${character.style}

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

EXAMPLES OF CORRECT RESPONSES:
Caesar: "Ave, citizen. Your words reach the ears of one who has crossed the Rubicon..."
Shakespeare: "Well met, gentle soul. Thy words do stir within me thoughts of mortal coil..."
Gandhi: "My friend, in times of struggle, I have found that truth and non-violence..."

${contextHistory}

RESPOND AS ${character.name} WITH ABSOLUTE HISTORICAL AUTHENTICITY. NO MODERN LANGUAGE ALLOWED.

User message: "${message}"`;

            // For now, return a character-appropriate response based on their data
            // In production, this would call OpenAI API
            const characterResponse = await generateCharacterResponse(character, message, systemPrompt);
            
            return {
              id: charId,
              name: character.name,
              content: characterResponse
            };
          })
        );

        // Filter out null responses (characters who didn't respond)
        const responses = allResponses.filter(response => response !== null);

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