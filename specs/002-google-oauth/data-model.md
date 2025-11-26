# Data Model: Google OAuth Integration

**Feature**: 002-google-oauth
**Date**: 2025-11-26

## Entities

### AuthConfig

Configuration loaded from `.md-server-auth.json` file.

```typescript
type AuthConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  callbackUrl: string | null;  // null = auto-detect from request
  allowedDomains: ReadonlyArray<string> | null;  // null = allow all
  sessionSecret: string;
  sessionMaxAge: number;  // milliseconds, default 86400000 (24h)
}>;
```

**Validation Rules**:
- `clientId`: Required, non-empty string
- `clientSecret`: Required, non-empty string
- `callbackUrl`: Optional, must be valid URL if provided
- `allowedDomains`: Optional, array of non-empty strings
- `sessionSecret`: Required, minimum 32 characters
- `sessionMaxAge`: Optional, positive integer, default 86400000

**Source**: JSON file at path specified by `--auth-config` or default `.md-server-auth.json`

---

### UserSession

Represents an authenticated user's session stored in memory.

```typescript
type UserSession = Readonly<{
  email: string;
  name: string | null;
  picture: string | null;
  authenticatedAt: number;  // Unix timestamp ms
  expiresAt: number;  // Unix timestamp ms
}>;
```

**Lifecycle**:
1. Created after successful OAuth callback
2. Stored in express-session (memory)
3. Accessed on each protected request
4. Destroyed on logout or expiration

---

### OAuthState

Temporary state stored during OAuth flow (in session).

```typescript
type OAuthState = Readonly<{
  state: string;  // CSRF protection token
  codeVerifier: string;  // PKCE code verifier
  returnUrl: string;  // Original URL user was accessing
  createdAt: number;  // Unix timestamp ms
}>;
```

**Lifecycle**:
1. Created when user is redirected to Google
2. Validated on callback
3. Deleted after successful authentication or timeout (5 minutes)

---

### AuthError

Structured error for authentication failures.

```typescript
const AUTH_ERROR_CODES = {
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',
  AUTH_DENIED: 'AUTH_DENIED',
  AUTH_FAILED: 'AUTH_FAILED',
  DOMAIN_BLOCKED: 'DOMAIN_BLOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  STATE_MISMATCH: 'STATE_MISMATCH',
} as const;

type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

type AuthError = Readonly<{
  code: AuthErrorCode;
  message: string;
  details: string | null;
}>;
```

---

## Relationships

```
┌─────────────────┐
│   AuthConfig    │──── loaded at startup ────►┌─────────────────┐
│  (config file)  │                            │  Server Config  │
└─────────────────┘                            └─────────────────┘
                                                       │
                                                       ▼
┌─────────────────┐                            ┌─────────────────┐
│   OAuthState    │◄── created on redirect ────│  Auth Middleware│
│   (session)     │                            └─────────────────┘
└─────────────────┘                                    │
        │                                              │
        │ validated on callback                        │
        ▼                                              ▼
┌─────────────────┐                            ┌─────────────────┐
│   UserSession   │◄── created on success ─────│  OAuth Callback │
│   (session)     │                            └─────────────────┘
└─────────────────┘
        │
        │ checked on each request
        ▼
┌─────────────────┐
│ Protected Route │
└─────────────────┘
```

## State Transitions

### Authentication Flow

```
┌──────────┐     access protected     ┌──────────────┐
│  Guest   │ ─────────────────────►   │ Redirecting  │
└──────────┘                          └──────────────┘
                                             │
                                             │ redirect to Google
                                             ▼
                                      ┌──────────────┐
                                      │ Authenticating│
                                      └──────────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
                  ┌──────────┐        ┌──────────┐        ┌──────────┐
                  │ Denied   │        │  Error   │        │Authenticated│
                  └──────────┘        └──────────┘        └──────────┘
                         │                   │                   │
                         ▼                   ▼                   │
                  ┌──────────┐        ┌──────────┐              │
                  │Error Page│        │Error Page│              │
                  └──────────┘        └──────────┘              │
                                                                │
                                                                ▼
                                                         ┌──────────┐
                                                         │  Active  │
                                                         │ Session  │
                                                         └──────────┘
                                                                │
                                      ┌─────────────────────────┼─────────────┐
                                      │                         │             │
                                      ▼                         ▼             ▼
                               ┌──────────┐              ┌──────────┐  ┌──────────┐
                               │  Logout  │              │ Expired  │  │ Continue │
                               └──────────┘              └──────────┘  │ Browsing │
                                      │                         │      └──────────┘
                                      ▼                         │
                               ┌──────────┐                     │
                               │  Guest   │◄────────────────────┘
                               └──────────┘
```

## Config File Example

```json
{
  "clientId": "123456789.apps.googleusercontent.com",
  "clientSecret": "GOCSPX-xxxxxxxxxxxxx",
  "allowedDomains": ["company.com", "partner.org"],
  "sessionSecret": "at-least-32-characters-long-random-string",
  "sessionMaxAge": 86400000
}
```

## Session Storage Schema

Express session data structure:

```typescript
declare module 'express-session' {
  interface SessionData {
    user?: UserSession;
    oauth?: OAuthState;
  }
}
```
