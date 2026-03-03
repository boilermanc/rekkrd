import type { Request, Response, NextFunction } from 'express';

/**
 * Typed error with HTTP status code.
 * Throw from route handlers to return a specific status + message.
 */
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global Express error handler — must be registered AFTER all routes.
 * Catches errors passed via next(err) and returns a consistent JSON shape.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  // Always log server errors with context
  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({ error: message });
}
