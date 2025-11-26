/**
 * T020: State token generator for CSRF protection
 * Pure function per constitution
 */
import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically random state token for CSRF protection
 * @returns 32-character URL-safe random string
 */
export const generateStateToken = (): string => {
  return randomBytes(16).toString('hex');
};
