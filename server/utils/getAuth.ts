import type { Request } from 'express';
import type { AuthResult } from '../middleware/auth.js';

/**
 * Extracts the authenticated user ID from an Express request.
 * Assumes `requireAuthWithUser` middleware has already run.
 */
export function getAuth(req: Request): string {
  return (req as Request & { auth: AuthResult }).auth.userId;
}
