import { z } from 'zod';
import { createMockResponse, getRouteHandler } from './route-handler-utils';

jest.mock('../services/conversation/conversationService', () => ({
  parseConversationRequest: jest.fn(),
  runConversationTurn: jest.fn(),
}));

import { conversationRoutes } from '../routes/conversations';
import { parseConversationRequest, runConversationTurn } from '../services/conversation/conversationService';

const parseMock = parseConversationRequest as jest.MockedFunction<typeof parseConversationRequest>;
const runMock = runConversationTurn as jest.MockedFunction<typeof runConversationTurn>;

describe('conversation route handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns success payload on valid request', async () => {
    parseMock.mockReturnValue({
      message: 'hello',
      characters: ['1'],
      sessionId: 'session-1',
      requestId: 'req-1',
    });
    runMock.mockResolvedValue([{ id: '1', name: 'Socrates', content: 'Hello there.' }]);

    const handler = getRouteHandler(conversationRoutes, 'post', '/');
    const req = {
      body: { message: 'hello', characters: ['1'] },
      header: (name: string) => (name === 'x-request-id' ? 'req-1' : undefined),
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect((res.body as { status: string }).status).toBe('success');
    expect(parseMock).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalled();
  });

  it('returns 400 for zod parse failures', async () => {
    const schema = z.object({ requiredField: z.string() });
    try {
      schema.parse({});
    } catch (error) {
      parseMock.mockImplementation(() => {
        throw error;
      });
    }

    const handler = getRouteHandler(conversationRoutes, 'post', '/');
    const req = {
      body: { message: 'hello' },
      header: () => undefined,
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect((res.body as { message: string }).message).toBe('Invalid request payload');
  });

  it('returns 500 for non-zod failures', async () => {
    parseMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const handler = getRouteHandler(conversationRoutes, 'post', '/');
    const req = {
      body: { message: 'hello', characters: ['1'] },
      header: () => undefined,
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect((res.body as { status: string }).status).toBe('error');
  });
});
