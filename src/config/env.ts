import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOG_LEVEL: z.string().default('info'),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  PROJECT_NAME: z.string().default('theroundtable'),
  ENVIRONMENT: z.string().default('dev'),

  REDIS_URL: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_TIMEOUT_MS: z.coerce.number().default(12000),
  OPENAI_CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(3),
  OPENAI_CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().default(30000),
  RESPONSE_GENERATOR_MODE: z.enum(['auto', 'openai', 'deterministic']).default('auto'),

  AWS_LAMBDA_FUNCTION_NAME: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

export function validateRuntimeEnvironment(runtime: 'http' | 'lambda' | 'test'): void {
  const env = getEnv();

  if (runtime === 'test') {
    return;
  }

  if (env.NODE_ENV === 'production') {
    if (!env.OPENAI_API_KEY && env.RESPONSE_GENERATOR_MODE !== 'deterministic') {
      throw new Error('OPENAI_API_KEY is required in production unless RESPONSE_GENERATOR_MODE=deterministic.');
    }
  }
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}
