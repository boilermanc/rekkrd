import crypto from 'crypto';

/** Timing-safe string comparison to prevent timing attacks on secret tokens. */
export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Burn the same time as a real comparison to avoid leaking length info
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
