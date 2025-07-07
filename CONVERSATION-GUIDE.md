# TheRoundTable Conversation Unification Guide

This guide explains how to use the unified conversation management tools for TheRoundTable project. These tools ensure consistent conversation handling and character responses across both backend and frontend components.

## Overview

The conversation unification consists of these components:

1. **Shared Conversation Manager** - Core utilities for managing conversations with consistent character personas and responses
2. **Conversation Flow Manager** - Manages the end-to-end flow of conversations
3. **Backend Adapter** - Integrates the flow manager into Express routes
4. **Frontend Utilities** - Helper functions for frontend components

## Installation and Setup

### Step 1: Create the Shared Directory

Ensure the `shared` directory exists at the project root:

```bash
mkdir -p shared
```

### Step 2: Install Dependencies

```bash
npm install uuid openai @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb --save
```

### Step 3: Copy Shared Files

Copy these files to the shared directory:
- `conversation-manager.js` / `.ts` - Core utilities
- `conversation-flow-manager.js` / `.ts` - Flow management

## Backend Integration

### Using the Backend Adapter

1. Modify `theroundtable-backend/server.js` to use the adapter:

```javascript
const { createConversationRoutes } = require('./conversation-adapter');

// Replace the existing conversation routes with the adapter version
app.use('/conversations', createConversationRoutes());
```

### Manual Integration

If you prefer to integrate manually, here's how to use the flow manager:

```javascript
const { ConversationFlowManager } = require('../shared/conversation-flow-manager');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create flow manager instance
const flowManager = new ConversationFlowManager({
  aiClient: openai,
  dynamoDB: dynamoDBClient,
  redisClient: redisClient,
  logger: logger
});

// Process a conversation
app.post('/conversations', async (req, res) => {
  try {
    const { message, characters, conversationId } = req.body;
    
    const result = await flowManager.processMessage({
      message,
      characters,
      conversationId
    });
    
    return res.json({ status: 'success', data: result });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});
```

## Frontend Integration

### Using the Shared Utilities in the Frontend

1. Import the conversation manager in your React components:

```typescript
// src/services/conversation.ts
import { getDefaultCharacterById } from '../../../shared/conversation-manager';

// Use the shared utilities
export function getCharacterDetails(id: string) {
  return getDefaultCharacterById(id);
}
```

2. For TypeScript projects, ensure you have proper imports:

```typescript
// If using TypeScript
import { 
  Character,
  generateCharacterSystemPrompt
} from '../../../shared/conversation-manager';
```

### Example Implementation in React Component

```tsx
import React, { useState } from 'react';
import { getDefaultCharacterById } from '../../../shared/conversation-manager';

interface Props {
  characterId: string;
}

const CharacterPanel: React.FC<Props> = ({ characterId }) => {
  const [character, setCharacter] = useState(getDefaultCharacterById(characterId));
  
  return (
    <div>
      <h3>{character.name}</h3>
      <p>{character.background}</p>
    </div>
  );
};

export default CharacterPanel;
```

## Lambda Warmup Integration

The Lambda warmup utility can be enhanced to use the shared conversation tools:

```javascript
// warmup-lambda.js
const { warmupLambda } = require('./warmup-lambda');
const { getDefaultCharacterById } = require('../shared/conversation-manager');

async function enhancedWarmup() {
  // Get a simple character for the warmup request
  const character = getDefaultCharacterById('1'); // Socrates
  
  // First do the basic warmup
  await warmupLambda();
  
  // Then send a minimal conversation request
  try {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Hello",
        characters: [character.id]
      }),
      timeout: 15000
    });
    
    console.log(`Warmup conversation response: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Enhanced warmup failed:', error);
    return false;
  }
}

module.exports = { warmupLambda, enhancedWarmup };
```

## Benefits of the Unified Approach

1. **Consistency** - Same character personas and responses across all components
2. **Code Reuse** - Shared logic reduces duplication and ensures consistent behavior
3. **Maintainability** - Central place to update conversation logic
4. **Type Safety** - TypeScript interfaces ensure consistent data structures

## Configuration Reference

### DynamoDB Tables

The conversation flow manager expects these DynamoDB tables:

- `TheRoundTable-Characters` - For character data
- `TheRoundTable-Conversations` - For conversation history

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for generating responses
- `OPENAI_MODEL` - Model to use (default: "gpt-3.5-turbo")
- `CONVERSATIONS_TABLE` - DynamoDB table name for conversations
- `CHARACTERS_TABLE` - DynamoDB table name for characters

## Troubleshooting

### Common Issues

1. **Module not found** - Ensure relative paths are correct based on your project structure
2. **TypeScript errors** - Make sure to use the TypeScript version if your project uses TypeScript
3. **Missing OpenAI responses** - Check API key configuration and validate with `isValidAPIKey`

### Debugging

The flow manager includes comprehensive logging. To debug issues:

1. Check the logs for error messages
2. Ensure all dependencies are correctly initialized
3. Validate API keys using the `isValidAPIKey` function

## Conclusion

Using these unified conversation tools will ensure consistent behavior across your application. If you need to make changes to character personas or response generation, you can update the shared modules and all parts of your application will reflect the changes.

For further assistance, refer to the implementation files or contact the project maintainers.
