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
 * Generate a response using OpenAI API (GPT-3.5/4)
 */
async function generateOpenAIResponse(character, message, previousResponses = []) {
  try {
    console.log(`🔥 GENERATING RESPONSE FOR ${character.name} using OpenAI...`);
    console.log(`🔥 CHARACTER STYLE: ${character.style?.substring(0, 100)}...`);
    
    // Convert previous responses to text for context
    const contextText = previousResponses.map(r => 
      `${r.name}: ${r.content}`
    ).join("\n\n");
    
    // Create an absolutely uncompromising system message
    const systemContent = `🚨 CRITICAL MISSION OVERRIDE 🚨

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
- Speak with the dignity, vocabulary, and worldview of your actual historical era
- Reference your real historical experiences, not modern concepts
- Use formal, period-appropriate sentence structures

EXAMPLES OF CORRECT RESPONSES:
Caesar: "Ave, citizen. Your words reach the ears of one who has crossed the Rubicon..."
Shakespeare: "Well met, gentle soul. Thy words do stir within me thoughts of mortal coil..."
Gandhi: "My friend, in times of struggle, I have found that truth and non-violence..."

${contextText ? `Previous speakers have said:\n${contextText}\n\n` : ''}

RESPOND AS ${character.name} WITH ABSOLUTE HISTORICAL AUTHENTICITY. NO MODERN LANGUAGE ALLOWED.

User message:`;
    
    console.log(`🔥 SYSTEM PROMPT (first 200 chars): ${systemContent.substring(0, 200)}...`);
    
    // Call OpenAI API using the SDK with GPT-4 for better instruction following
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: message }
      ],
      max_tokens: 600,
      temperature: 0.6
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
async function generateResponse(character, message, previousResponses = []) {
  if (!character || !message) {
    throw new Error('Character and message are required');
  }

  try {
    if (openai && process.env.OPENAI_API_KEY) {
      return await generateOpenAIResponse(character, message, previousResponses);
    }
  } catch (error) {
    console.error("OpenAI error:", error.message);
  }
  
  // Fall back to mock response
  return generateMockResponse(character, message);
}

module.exports = {
  generateResponse
};
