import { handler } from '../lambda';

type EventInput = {
  method: 'GET' | 'POST' | 'OPTIONS';
  path: string;
  body?: unknown;
};

function eventOf(input: EventInput): any {
  return {
    requestContext: {
      http: {
        method: input.method,
      },
    },
    rawPath: input.path,
    headers: {
      'content-type': 'application/json',
    },
    body: input.body ? JSON.stringify(input.body) : null,
  };
}

function parseBody(result: { body: string }): any {
  return JSON.parse(result.body);
}

describe('lambda e2e', () => {
  it('returns health for /health', async () => {
    const result = await handler(eventOf({ method: 'GET', path: '/health' }), {} as never);

    expect(result.statusCode).toBe(200);
    const body = parseBody(result);
    expect(body.status).toBe('ok');
  });

  it('supports /api prefix parity', async () => {
    const result = await handler(eventOf({ method: 'GET', path: '/api/characters' }), {} as never);

    expect(result.statusCode).toBe(200);
    const body = parseBody(result);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('returns character by id', async () => {
    const result = await handler(eventOf({ method: 'GET', path: '/characters/1' }), {} as never);

    expect(result.statusCode).toBe(200);
    const body = parseBody(result);
    expect(body.data.id).toBe('1');
    expect(body.data.name).toBe('Socrates');
  });

  it('handles conversation request end-to-end', async () => {
    const result = await handler(
      eventOf({
        method: 'POST',
        path: '/conversations',
        body: {
          message: 'Hello everyone',
          characters: ['1', '2', '3', '4'],
          sessionId: 'lambda-e2e-greeting',
        },
      }),
      {} as never
    );

    expect(result.statusCode).toBe(201);
    const body = parseBody(result);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.responses)).toBe(true);
    const panelResponses = body.responses.filter((item: { id: string }) => item.id !== 'moderator');
    expect(panelResponses.length).toBeGreaterThanOrEqual(3);
    expect(panelResponses.length).toBeLessThanOrEqual(6);
    expect(body.responses[body.responses.length - 1]?.id).toBe('moderator');
    expect(body.sessionId).toBe('lambda-e2e-greeting');
  });

  it('prioritizes directly addressed character in conversation', async () => {
    const result = await handler(
      eventOf({
        method: 'POST',
        path: '/api/conversations',
        body: {
          message: 'Socrates, what is justice?',
          characters: ['1', '2', '3'],
          sessionId: 'lambda-e2e-direct-address',
        },
      }),
      {} as never
    );

    expect(result.statusCode).toBe(201);
    const body = parseBody(result);
    const responderIds = body.responses.map((item: { id: string }) => item.id);
    expect(responderIds).toContain('1');
  });

  it('returns 400 for invalid conversation payload', async () => {
    const result = await handler(
      eventOf({
        method: 'POST',
        path: '/conversations',
        body: {
          message: 'hello',
        },
      }),
      {} as never
    );

    expect(result.statusCode).toBe(400);
    const body = parseBody(result);
    expect(body.status).toBe('error');
  });
});
