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
    expect(env.OPENAI_MODEL).toBe('gpt-6-luna');
    expect(env).toHaveProperty('OPENAI_REASONING_EFFORT', 'none');
  });

  it('respects OpenAI model and reasoning effort overrides', () => {
    process.env = {
      OPENAI_MODEL: 'gpt-5.6-luna',
      OPENAI_REASONING_EFFORT: 'low',
    };
    resetEnvCacheForTests();

    const env = getEnv();
    expect(env.OPENAI_MODEL).toBe('gpt-5.6-luna');
    expect(env).toHaveProperty('OPENAI_REASONING_EFFORT', 'low');
  });

  it('rejects an invalid OpenAI reasoning effort', () => {
    process.env = { OPENAI_REASONING_EFFORT: 'turbo' };
    resetEnvCacheForTests();

    expect(() => getEnv()).toThrow();
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
