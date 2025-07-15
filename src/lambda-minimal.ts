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
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.9
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

// Fallback function for mock responses
function generateMockResponse(character: any, userMessage: string): string {
  const responses = {
    'Socrates': `*strokes beard thoughtfully* Ah, my friend, you ask about "${userMessage}". But tell me, do you truly know what this means? For as I always say, the unexamined life is not worth living. Let us question this together.`,
    'Marie Curie': `*adjusts laboratory equipment* Your question about "${userMessage}" is fascinating. In my research, I have learned that careful observation and persistent inquiry reveal nature's secrets. What observations have you made about this matter?`,
    'Leonardo da Vinci': `*sketches while speaking* Ah, "${userMessage}" - this reminds me of my studies in anatomy and mechanics. Everything in nature is connected, you see. Have you observed how this relates to the patterns we find in water flow or bird flight?`,
    'Albert Einstein': `*thoughtful pause* "${userMessage}" - this touches on something fundamental about our universe. As I often say, imagination is more important than knowledge. How do you envision this working in the grand scheme of things?`,
    'William Shakespeare': `*with dramatic flourish* Ah, "${userMessage}" - there's a question that would make fair Hamlet pause! 'Tis a matter that touches the very essence of human nature, methinks. What dreams may come from such ponderings?`
  };

  return responses[character.name as keyof typeof responses] || 
    `*in the voice of ${character.name}* Your question about "${userMessage}" is most intriguing. ${character.description.split(',')[0]} would say that ${character.core_beliefs?.[0] || 'wisdom comes through understanding'}.`;
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

            // Create a personality prompt for the character
            const systemPrompt = `You are ${character.name} having a casual, fun conversation at "The Round Table." 

CRITICAL: DO NOT be formal, academic, or stiff. Be natural and conversational like you're talking to friends.

${character.description}

Don't repeat previous greetings from conversation history. Respond naturally to the current message only.

PERSONALITY:
- Talk like a real person, not a textbook
- Show your personality, humor, and quirks
- Be warm, engaging, and relatable
- React naturally to what people say
- Use contractions (I'm, you're, don't, can't)
- Show emotion and enthusiasm
- Ask questions back to keep conversation going

EXAMPLES OF GOOD RESPONSES:
- "Hey there! Great to meet you all!"
- "Well, that's an interesting question..."
- "You know, I've always thought..."
- "Ha! That reminds me of when I..."

BACKGROUND: ${character.background}

${contextHistory}

CURRENT MESSAGE: "${message}"

Respond as ${character.name} would naturally talk - casual, warm, and engaging. NO formal language!`;

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