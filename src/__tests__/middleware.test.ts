import { EventEmitter } from 'events';
import { errorHandler } from '../middleware/errorHandler';
import { requestLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';
import { resetEnvCacheForTests } from '../config/env';

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requestLogger logs info on successful responses', () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    const res = new EventEmitter() as EventEmitter & { statusCode: number; on: (event: string, listener: (...args: unknown[]) => void) => EventEmitter };
    res.statusCode = 200;

    const next = jest.fn();
    requestLogger(
      {
        method: 'GET',
        originalUrl: '/api/health',
        header: () => 'req-123',
      } as never,
      res as never,
      next
    );

    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('errorHandler includes stack in development', () => {
    process.env.NODE_ENV = 'development';
    resetEnvCacheForTests();

    const logSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const res = {
      statusCode: 200,
      payload: {} as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    const err = Object.assign(new Error('failure'), { statusCode: 418 });
    errorHandler(err, { path: '/x', method: 'GET' } as never, res as never, jest.fn() as never);

    expect(logSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(418);
    expect((res.payload as { stack?: string }).stack).toBeDefined();
  });

  it('errorHandler hides stack outside development', () => {
    process.env.NODE_ENV = 'production';
    resetEnvCacheForTests();

    const res = {
      statusCode: 200,
      payload: {} as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    errorHandler(new Error('failure'), { path: '/x', method: 'GET' } as never, res as never, jest.fn() as never);

    expect(res.statusCode).toBe(500);
    expect((res.payload as { stack?: string }).stack).toBeUndefined();
  });
});
