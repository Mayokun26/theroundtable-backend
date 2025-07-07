import type { APIGatewayProxyHandler, APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';

// Sample character data for the application
const characters = [
  {
    id: '1',
    name: 'Socrates',
    category: 'Philosopher',
    era: 'Ancient Greece (470-399 BC)',
    description: 'Classical Greek philosopher credited as one of the founders of Western philosophy.',
    traits: ['Wisdom', 'Ethics', 'Logic', 'Questioning'],
    imageUrl: '/images/socrates.jpg',
    personality: 'Known for the Socratic method of questioning and his famous quote "I know that I know nothing."'
  },
  {
    id: '2',
    name: 'Marie Curie',
    category: 'Scientist',
    era: 'Modern Era (1867-1934)',
    description: 'Physicist and chemist who conducted pioneering research on radioactivity.',
    traits: ['Scientific', 'Dedicated', 'Pioneering', 'Resilient'],
    imageUrl: '/images/marie-curie.jpg',
    personality: 'Determined researcher who broke barriers for women in science.'
  },
  {
    id: '3',
    name: 'Sun Tzu',
    category: 'Military Strategist',
    era: 'Ancient China (544-496 BC)',
    description: 'Chinese general, military strategist, writer, and philosopher known for "The Art of War".',
    traits: ['Strategic', 'Disciplined', 'Philosophical', 'Tactical'],
    imageUrl: '/images/sun-tzu.jpg',
    personality: 'Master of strategy and warfare philosophy with deep insights into human nature.'
  },
  {
    id: '4',
    name: 'Leonardo da Vinci',
    category: 'Renaissance Genius',
    era: 'Renaissance (1452-1519)',
    description: 'Italian polymath known for his contributions to art, science, engineering, and invention.',
    traits: ['Creative', 'Innovative', 'Curious', 'Artistic'],
    imageUrl: '/images/leonardo.jpg',
    personality: 'The ultimate Renaissance man with boundless curiosity and artistic genius.'
  },
  {
    id: '5',
    name: 'Cleopatra VII',
    category: 'Egyptian Queen',
    era: 'Ancient Egypt (69-30 BC)',
    description: 'Last active pharaoh of Ancient Egypt, known for her intelligence and political acumen.',
    traits: ['Intelligent', 'Charismatic', 'Strategic', 'Multilingual'],
    imageUrl: '/images/cleopatra.jpg',
    personality: 'Brilliant ruler and diplomat who spoke multiple languages and was highly educated.'
  },
  {
    id: '6',
    name: 'Abraham Lincoln',
    category: 'President',
    era: 'Civil War Era (1809-1865)',
    description: '16th President of the United States who led the nation through the Civil War.',
    traits: ['Honest', 'Determined', 'Compassionate', 'Wise'],
    imageUrl: '/images/lincoln.jpg',
    personality: 'The Great Emancipator known for his honesty, humility, and dedication to unity.'
  }
];

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  console.log('Lambda event:', {
    path: event.path,
    pathParameters: event.pathParameters,
    resource: event.resource,
    method: event.httpMethod,
    requestId: context.awsRequestId
  });
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    // Get the actual path from proxy parameter or path
    const actualPath = event.pathParameters?.proxy || event.path || event.resource || '';
    
    // Handle different API endpoints
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Health check endpoint
    if (actualPath.includes('health') || actualPath === 'api/health') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'ok',
          message: 'API server is running',
          timestamp: new Date().toISOString(),
          requestId: context.awsRequestId,
          path: actualPath
        })
      };
    }

    // Characters endpoint
    if (actualPath.includes('characters') && !actualPath.includes('/')) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          data: characters,
          count: characters.length
        })
      };
    }

    // Character by ID endpoint
    if (actualPath.includes('characters/')) {
      const characterId = actualPath.split('/').pop();
      const character = characters.find(c => c.id === characterId);
      
      if (!character) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            status: 'error',
            message: 'Character not found'
          })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          data: character
        })
      };
    }

    // Conversation endpoint (placeholder)
    if (actualPath.includes('conversations') && event.httpMethod === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'success',
          message: 'Conversation started',
          conversationId: `conv_${Date.now()}`,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Default response with debugging info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'debug',
        message: 'Default endpoint',
        path: actualPath,
        resource: event.resource,
        pathParameters: event.pathParameters,
        method: event.httpMethod
      })
    };

  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Internal server error',
        error: error instanceof Error ? error.message : String(error)
      })
    };
  }
};
