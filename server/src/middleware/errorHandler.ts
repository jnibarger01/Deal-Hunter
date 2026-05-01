import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const headers = req.headers ?? {};
  const requestId = headers['x-request-id']?.toString() ?? null;
  const context = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: headers['user-agent'] ?? null,
    message: err.message,
    stack: err.stack,
    sentryEnabled: Boolean(process.env.SENTRY_DSN),
  };

  if (err instanceof AppError) {
    logger.error('Operational request error', {
      ...context,
      statusCode: err.statusCode,
      operational: true,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  }

  logger.error('Unhandled request error', context);

  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && {
        originalError: err.message,
        stack: err.stack,
      }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
    },
  });
};
