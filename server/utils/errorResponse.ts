import type { Response } from 'express';

/**
 * Sends a standardized error JSON response.
 * Optionally includes a machine-readable `code` field.
 */
export function errorResponse(res: Response, status: number, message: string, code?: string): void {
  res.status(status).json({ error: message, code: code ?? message });
}
