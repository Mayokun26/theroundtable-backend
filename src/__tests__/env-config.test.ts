import { getEnv, resetEnvCacheForTests, validateRuntimeEnvironment } from '../config/env';

describe('env config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
  });

  it('provides defaults when vars are absent', () => {
    process.env = {};
    resetEnvCacheForTests();

    const env = getEnv();
    expect(env.PORT).toBe(3001);
    expect(env.AWS_REGION).toBe('us-east-1');
    expect(env.RESPONSE_GENERATOR_MODE).toBe('auto');
  });

  it('throws in production when OpenAI key is missing and deterministic mode is off', () => {
    process.env = {
      NODE_ENV: 'production',
      RESPONSE_GENERATOR_MODE: 'openai',
    };
    resetEnvCacheForTests();

    expect(() => validateRuntimeEnvironment('http')).toThrow('OPENAI_API_KEY is required in production');
  });

  it('allows production without OpenAI key when deterministic mode is enabled', () => {
    process.env = {
      NODE_ENV: 'production',
      RESPONSE_GENERATOR_MODE: 'deterministic',
    };
    resetEnvCacheForTests();

    expect(() => validateRuntimeEnvironment('http')).not.toThrow();
  });
});
