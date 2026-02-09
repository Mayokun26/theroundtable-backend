import { EventEmitter } from 'events';

export interface MockResponse extends EventEmitter {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
}

export function createMockResponse(): MockResponse {
  const emitter = new EventEmitter() as MockResponse;
  emitter.statusCode = 200;
  emitter.body = null;
  emitter.status = (code: number) => {
    emitter.statusCode = code;
    return emitter;
  };
  emitter.json = (payload: unknown) => {
    emitter.body = payload;
    return emitter;
  };

  return emitter;
}

export function getRouteHandler(
  router: any,
  method: 'get' | 'post',
  path: string
): (...args: unknown[]) => unknown {
  const layer = router.stack.find(
    (entry: any) => entry.route && entry.route.path === path && entry.route.methods[method]
  );

  if (!layer?.route?.stack?.[0]?.handle) {
    throw new Error(`Route handler not found: ${method.toUpperCase()} ${path}`);
  }

  return layer.route.stack[0].handle;
}
