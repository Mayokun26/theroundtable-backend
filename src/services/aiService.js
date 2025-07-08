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
    console.log(`Generating response for ${character.name} using OpenAI...`);
    
    // Convert previous responses to text for context
    const contextText = previousResponses.map(r => 
      `${r.name}: ${r.content}`
    ).join("\n\n");
    
    // Create system message with character info
    const systemContent = `You are ${character.name}. ${character.background}

Style guide: ${character.style || 'Respond authentically based on your historical background and personality.'}

${contextText ? `Previous participants have responded:\n${contextText}\n\n` : ''}You will respond to the user's question from your unique perspective and in your distinctive voice. Keep your response concise and under 150 words.`;
    
    // Call OpenAI API using the SDK
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: message }
      ],
      max_tokens: 300,
      temperature: 0.7
    });
    
    const content = response.choices[0].message.content.trim();
    console.log(`Successfully generated response for ${character.name} using OpenAI (${content.length} chars)`);
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
