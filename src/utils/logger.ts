import winston from 'winston';
import { getEnv } from '../config/env';

const env = getEnv();

// Create transports based on environment
const transports: winston.transport[] = [
  // Console transport - always available
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Only add file transports if not running in Lambda
if (!env.AWS_LAMBDA_FUNCTION_NAME) {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  );
}

// Create a winston logger
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  silent: env.NODE_ENV === 'test',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'theroundtable-backend' },
  transports
}); 
