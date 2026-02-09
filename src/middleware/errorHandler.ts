import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getEnv } from '../config/env';

interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const env = getEnv();
  const statusCode = err.statusCode || 500;
  
  // Log error
  logger.error(`Error: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
    details: err.details
  });

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
