/**
 * Normalises a matrix string for comparison:
 * - lowercase
 * - collapse whitespace and dashes to single space
 * - strip trailing/leading whitespace
 */
export function normaliseMatrix(str: string): string {
  return str.toLowerCase().replace(/[-\s]+/g, ' ').trim();
}

/**
 * Score how well `candidate` matches `query`.
 * Returns 0–1 (1 = exact match after normalisation).
 */
export function matrixScore(query: string, candidate: string): number {
  const q = normaliseMatrix(query);
  const c = normaliseMatrix(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.includes(q) || q.includes(c)) {
    return Math.min(q.length, c.length) / Math.max(q.length, c.length);
  }
  return 0;
}

/**
 * Extract all matrix-like strings from a raw Discogs release object.
 */
export function extractMatrixStrings(release: Record<string, unknown>): string[] {
  const results: string[] = [];
  if (typeof release.notes === 'string') {
    results.push(release.notes);
  }
  if (Array.isArray(release.extrainstances)) {
    for (const ei of release.extrainstances as Record<string, unknown>[]) {
      if (typeof ei.description === 'string') results.push(ei.description);
    }
  }
  return results;
}
