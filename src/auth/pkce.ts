/**
 * T019: PKCE helper functions for OAuth2 security
 * Pure functions per constitution
 */
import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically random code verifier for PKCE
 * @returns 43-128 character URL-safe random string
 */
export const generateCodeVerifier = (): string => {
  // Generate 32 random bytes and encode as base64url
  const buffer = randomBytes(32);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * Generate code challenge from verifier using SHA256
 * @param verifier The code verifier string
 * @returns Base64url-encoded SHA256 hash of the verifier
 */
export const generateCodeChallenge = (verifier: string): string => {
  const hash = createHash('sha256').update(verifier).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};
