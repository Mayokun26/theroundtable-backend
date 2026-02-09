import { APIGatewayProxyResult, Context } from 'aws-lambda';
import { getAllCharacters, getCharacterById } from './repositories/characterRepository';
import { parseConversationRequest, runConversationTurn } from './services/conversation/conversationService';
import { logger } from './utils/logger';
import { createRedisClient } from './config/redis';
import { ZodError } from 'zod';
import { validateRuntimeEnvironment } from './config/env';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

let initialized = false;

async function initialize(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    validateRuntimeEnvironment('lambda');
    await createRedisClient();
  } catch (error) {
    logger.warn('Lambda startup: Redis initialization failed; continuing with fallback.', { error });
  }

  initialized = true;
}

function ok(body: unknown, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}

function parseBody(body: string | null | undefined): unknown {
  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function normalizePath(rawPath: string | undefined): string {
  if (!rawPath) {
    return '/';
  }

  let path = rawPath;
  path = path.replace(/^\/(dev|prod|staging)\//, '/');
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  // Keep parity with Express-style paths when API Gateway forwards /api prefix.
  if (path.startsWith('/api/')) {
    path = path.replace(/^\/api/, '');
  }

  return path;
}

export const handler = async (event: any, _context: Context): Promise<APIGatewayProxyResult> => {
  try {
    await initialize();

    const method = event.requestContext?.http?.method ?? event.httpMethod ?? 'GET';
    const path = normalizePath(event.rawPath ?? event.path);

    if (method === 'OPTIONS') {
      return ok({});
    }

    if (method === 'GET' && path === '/health') {
      return ok({ status: 'ok', message: 'API server is running', timestamp: new Date().toISOString() });
    }

    if (method === 'GET' && path === '/characters') {
      return ok({ status: 'success', message: 'List of characters returned', data: getAllCharacters() });
    }

    if (method === 'GET' && path.startsWith('/characters/')) {
      const id = path.split('/')[2] ?? '';
      const character = getCharacterById(id);

      if (!character) {
        return ok({ status: 'error', message: 'Character not found' }, 404);
      }

      return ok({ status: 'success', data: character });
    }

    if (method === 'POST' && path === '/conversations') {
      const payload = parseBody(event.body);
      const requestId = event.headers?.['x-request-id'] || event.headers?.['X-Request-Id'] || `req-${Date.now()}`;
      const request = parseConversationRequest({ ...(payload as object), requestId });
      const responses = await runConversationTurn(request);

      return ok(
        {
          status: 'success',
          responses,
          sessionId: request.sessionId,
          requestId,
        },
        201
      );
    }

    return ok({ status: 'error', message: 'Not found', path, method }, 404);
  } catch (error) {
    if (error instanceof ZodError) {
      return ok(
        {
          status: 'error',
          message: 'Invalid request payload',
          details: error.issues,
        },
        400
      );
    }

    logger.error('Lambda handler error', { error });
    return ok({ status: 'error', message: 'Internal server error' }, 500);
  }
};
