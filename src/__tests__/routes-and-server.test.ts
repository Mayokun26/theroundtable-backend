import { createServer } from '../server';
import { healthRoutes } from '../routes/health';
import { characterRoutes } from '../routes/characters';
import { createMockResponse, getRouteHandler } from './route-handler-utils';

describe('route handlers and server wiring', () => {
  it('health route returns ok payload', () => {
    const handler = getRouteHandler(healthRoutes, 'get', '/');

    const req = {};
    const res = createMockResponse();
    handler(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as { status: string; message: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(body.message).toBe('API server is running');
    expect(typeof body.timestamp).toBe('string');
  });

  it('characters route returns list and handles missing id', () => {
    const listHandler = getRouteHandler(characterRoutes, 'get', '/');
    const itemHandler = getRouteHandler(characterRoutes, 'get', '/:id');

    const listRes = createMockResponse();
    listHandler({}, listRes);
    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.body as { data: unknown[] };
    expect(Array.isArray(listBody.data)).toBe(true);
    expect(listBody.data.length).toBeGreaterThan(0);

    const missingRes = createMockResponse();
    itemHandler({ params: { id: 'does-not-exist' } }, missingRes);
    expect(missingRes.statusCode).toBe(404);
    expect((missingRes.body as { message: string }).message).toBe('Character not found');
  });

  it('server mounts expected API route prefixes', () => {
    const app = createServer();
    const routerStack = (app as unknown as { _router?: { stack?: Array<{ route?: { path?: string }; regexp?: { toString: () => string } }> } })._router?.stack ?? [];

    const stackText = routerStack.map((layer) => {
      if (layer.route?.path) {
        return String(layer.route.path);
      }
      return layer.regexp?.toString() ?? '';
    });

    expect(stackText.some((line) => /api\\\/health|\/api\/health/.test(line))).toBe(true);
    expect(stackText.some((line) => /api\\\/characters|\/api\/characters/.test(line))).toBe(true);
    expect(stackText.some((line) => /api\\\/conversations|\/api\/conversations/.test(line))).toBe(true);
  });
});
