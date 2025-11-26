/**
 * Authentication types for Google OAuth integration
 */

// T004: Auth error codes as const object (not enum per constitution)
export const AUTH_ERROR_CODES = {
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',
  AUTH_DENIED: 'AUTH_DENIED',
  AUTH_FAILED: 'AUTH_FAILED',
  DOMAIN_BLOCKED: 'DOMAIN_BLOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  STATE_MISMATCH: 'STATE_MISMATCH',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

// T004: AuthConfig type
export type AuthConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  callbackUrl: string | null;
  allowedDomains: ReadonlyArray<string> | null;
  sessionSecret: string;
  sessionMaxAge: number;
}>;

// T005: UserSession type
export type UserSession = Readonly<{
  email: string;
  name: string | null;
  picture: string | null;
  authenticatedAt: number;
  expiresAt: number;
}>;

// T006: OAuthState type
export type OAuthState = Readonly<{
  state: string;
  codeVerifier: string;
  returnUrl: string;
  createdAt: number;
}>;

// T007: AuthError type
export type AuthError = Readonly<{
  code: AuthErrorCode;
  message: string;
  details: string | null;
}>;

// Session data extension for express-session
declare module 'express-session' {
  interface SessionData {
    user?: UserSession;
    oauth?: OAuthState;
  }
}
