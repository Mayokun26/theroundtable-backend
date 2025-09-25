import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createServer } from './server';
import { logger } from './utils/logger';
import { checkDynamoDBConnection } from './config/dynamodb';
import { createRedisClient, isRedisEnabled } from './config/redis';

// Create the Express app
const server = createServer();

// Cache for initialized connections
let isInitialized = false;

async function initializeConnections() {
  if (isInitialized) return;
  
  try {
    // Skip DynamoDB connection for now - just log
    logger.info('Skipping DynamoDB connection for testing');

    // Initialize Redis - but don't stop if it fails
    try {
      await createRedisClient();
      if (isRedisEnabled()) {
        logger.info('Connected to Redis');
      } else {
        logger.warn('Redis is disabled, application will continue with limited functionality');
      }
    } catch (error) {
      logger.warn('Failed to connect to Redis, continuing without Redis:', error);
    }

    isInitialized = true;
    logger.info('Lambda function initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Lambda function:', error);
    throw error;
  }
}

// Lambda handler
export const handler = async (
  event: any, // Use any for now since API Gateway v2 has different structure
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Log that we entered the handler
    logger.info('Lambda handler started', { eventKeys: Object.keys(event) });
    
    // Initialize connections on first request
    await initializeConnections();

    // Handle API Gateway v2 event structure
    const httpMethod = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path;
    const headers = event.headers || {};
    const body = event.body || null;
    const queryStringParameters = event.queryStringParameters || {};
    const pathParameters = event.pathParameters || {};
    
    // Debug logging - log the full event to understand the structure
    logger.info('Received request:', { 
      httpMethod, 
      path, 
      pathParameters,
      headers: Object.keys(headers || {}), 
      eventKeys: Object.keys(event),
      requestContext: event.requestContext ? Object.keys(event.requestContext) : 'none',
      rawPath: event.rawPath,
      rawQueryString: event.rawQueryString
    });

    // Create query string safely
    let queryString = '';
    if (queryStringParameters) {
      const params = new URLSearchParams();
      Object.entries(queryStringParameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value));
        }
      });
      queryString = params.toString();
    }

    // Create a mock request object
    const mockRequest = {
      method: httpMethod,
      url: path + (queryString ? '?' + queryString : ''),
      headers: headers || {},
      body: body || ''
    };

    // Create a mock response object
    let responseData: APIGatewayProxyResult = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };

    // Handle OPTIONS requests for CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          'Content-Type': 'application/json'
        },
        body: ''
      };
    }

    // Handle the request using the Express app
    return new Promise((resolve, reject) => {
      // Create a minimal Express-like request/response simulation
      // Safely parse body
      let parsedBody = {};
      if (body) {
        try {
          parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch (error) {
          logger.warn('Failed to parse request body:', error);
          parsedBody = {};
        }
      }

      const req = {
        ...mockRequest,
        get: (name: string) => headers?.[name] || headers?.[name.toLowerCase()],
        query: queryStringParameters || {},
        params: {},
        body: parsedBody
      };

      const res = {
        statusCode: 200,
        headers: responseData.headers,
        status: (code: number) => {
          responseData.statusCode = code;
          return res;
        },
        json: (data: any) => {
          responseData.body = JSON.stringify(data);
          resolve(responseData);
        },
        send: (data: any) => {
          responseData.body = typeof data === 'string' ? data : JSON.stringify(data);
          resolve(responseData);
        },
        setHeader: (name: string, value: string) => {
          if (responseData.headers) {
            responseData.headers[name] = value;
          }
        }
      };

      // Simple routing based on path
      // For API Gateway v2, the path is in rawPath or path
      let routePath = path || '/';
      
      // Remove stage prefix if present (e.g., /dev/health -> /health)
      if (routePath.startsWith('/dev/')) {
        routePath = routePath.substring(4);
      }
      
      // Ensure routePath starts with /
      if (!routePath.startsWith('/')) {
        routePath = '/' + routePath;
      }
      
      // If empty after processing, set to root
      if (routePath === '') routePath = '/';
      
      // Debug logging for routing
      logger.info('Routing:', { originalPath: path, pathParameters, routePath, httpMethod, rawPath: event.rawPath });
      
      if (routePath === '/health' && httpMethod === 'GET') {
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      } else if (routePath === '/characters' && httpMethod === 'GET') {
        // Import characters data
        const characters = require('./data/characters');
        
        // Fix image URLs to use placeholder service
        const charactersWithImages = characters.map((char: any) => ({
          ...char,
          imageUrl: `https://via.placeholder.com/200x200/4a5568/ffffff?text=${encodeURIComponent(char.name)}`
        }));
        
        res.json({ data: charactersWithImages });
      } else if (routePath === '/conversations' && httpMethod === 'POST') {
        // Simple conversation response
        const requestBody = req.body as { message?: string; characters?: string[] };
        const { message = '', characters: selectedCharacters = [] } = requestBody;
        
        // Import characters data - fix import consistency
        const characters = require('./data/characters');
        
        // Mock responses for now
        const responses = selectedCharacters.map((charId: string) => {
          const character = characters.find((c: any) => c.id === charId);
          return {
            id: charId,
            name: character?.name || 'Unknown',
            content: `Hello! I'm ${character?.name || 'Unknown'}. You asked: "${message}". That's an interesting question!`
          };
        });
        
        res.json({ responses });
      } else {
        res.status(404).json({ 
          error: 'Not found', 
          path: routePath, 
          method: httpMethod, 
          availableRoutes: ['/health', '/characters'] 
        });
      }
    });

  } catch (error) {
    logger.error('Lambda handler error:', error);
    console.error('Lambda handler error:', error); // Also log to console
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};