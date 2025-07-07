# TheRoundTable OpenAI Integration Guide

## Overview

TheRoundTable uses OpenAI's API to generate character-specific responses for the conversation feature. This document explains how the integration works, how to configure it, and how to troubleshoot common issues.

## Implementation Details

### Backend Integration

The OpenAI integration is implemented in the backend's conversation route:

```typescript
// Initialize OpenAI with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Generate character-specific responses using OpenAI
async function generateCharacterResponse(userMessage, character) {
  // Create a character-specific prompt
  const systemPrompt = `You are ${character.name} from ${character.era}...`;
  
  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7,
    max_tokens: 200
  });
  
  return response.choices[0]?.message?.content || fallbackResponse;
}
```

### Configuration

#### Required Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key

#### API Settings

- **Model**: gpt-3.5-turbo (default)
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 200 (keeps responses concise)

## Character Prompt Engineering

Each character has a specialized system prompt that includes:

1. **Identity**: Character name and era
2. **Background**: Brief historical context
3. **Traits**: Key personality characteristics
4. **Speaking Style**: Guidelines for response tone/style
5. **Knowledge Boundaries**: Limitations based on the character's era

Example for Socrates:
```
You are Socrates from Ancient Greece who was a classical philosopher credited as founder of Western philosophy.
Known for being questioning, wise, and thought-provoking.
Respond using the Socratic method, asking insightful questions, and expressing ideas about virtue, justice, and knowledge.
Your knowledge is limited to what would have been known in Ancient Greece (470-399 BC).
```

## Troubleshooting

### Common Issues

1. **API Key Problems**
   - **Symptom**: "Authentication error" or empty responses
   - **Solution**: Verify the API key is correctly set in Lambda environment variables

2. **Empty Responses**
   - **Symptom**: API returns success but no character responses
   - **Solution**: Check CloudWatch logs for timeout issues or errors
   - **Solution**: Verify the response parsing logic in the backend code

3. **Rate Limiting**
   - **Symptom**: "Rate limit exceeded" errors
   - **Solution**: Implement request throttling or upgrade OpenAI plan

4. **Timeout Issues**
   - **Symptom**: Requests time out before completion
   - **Solution**: Increase Lambda timeout setting (default: 30s)

### Testing the Integration

Use the provided API test script to verify the OpenAI integration:

```javascript
// Test conversations endpoint
const conversationPayload = {
  message: "What do you think about knowledge?",
  characters: ["1", "2"]  // Socrates and Marie Curie
};

const response = await fetch(`${API_URL}/conversations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(conversationPayload)
});
```

## Fallback Mechanism

If OpenAI fails to generate a response, the system falls back to template-based responses:

```typescript
try {
  // Try OpenAI generation
  const content = await generateOpenAIResponse(message, character);
  return content;
} catch (error) {
  logger.error(`OpenAI error: ${error}`);
  // Fall back to template response
  return generateTemplateResponse(message, character);
}
```

## Cost Management

To manage OpenAI API costs:

1. **Token Limitations**: Max tokens set to 200 per response
2. **Caching**: Consider implementing response caching for common questions
3. **Monitoring**: Regularly check API usage in OpenAI dashboard

## Future Improvements

1. **Model Selection**: Option to use different models based on complexity
2. **Character Memory**: Maintain conversation context for more coherent exchanges
3. **Response Filtering**: Additional safety filters for inappropriate content
4. **Streaming Responses**: Implement streaming for more responsive user experience
