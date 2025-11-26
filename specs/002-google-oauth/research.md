# Research: Google OAuth Integration

**Feature**: 002-google-oauth
**Date**: 2025-11-26

## OAuth Library Selection

### Decision: `google-auth-library`

**Rationale**: Official Google library for Node.js OAuth2 authentication. Well-maintained, minimal dependencies, handles token verification and refresh automatically.

**Alternatives Considered**:

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| google-auth-library | Official, maintained, typed | Slightly larger | ✅ Selected |
| passport-google-oauth20 | Popular, Express integration | Requires passport core, more complexity | ❌ Rejected |
| simple-oauth2 | Generic, lightweight | No Google-specific helpers, manual setup | ❌ Rejected |
| Manual implementation | No dependencies | Security risk, maintenance burden | ❌ Rejected |

## Session Management

### Decision: `express-session` with MemoryStore

**Rationale**: Standard Express session middleware. MemoryStore is built-in, requires no additional dependencies, and aligns with spec requirement for in-memory sessions.

**Configuration**:
- Cookie: `httpOnly: true`, `secure: auto` (based on HTTPS detection)
- Session duration: 24 hours (configurable in auth config)
- Session secret: Required in config file

**Alternatives Considered**:

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| express-session + MemoryStore | Built-in, simple, no deps | Not production-scale (fine for docs server) | ✅ Selected |
| cookie-session | Stateless, no storage | Limited data size, less secure for tokens | ❌ Rejected |
| Custom JWT | No server storage | Complexity, can't invalidate sessions | ❌ Rejected |

## OAuth Flow Implementation

### Decision: Authorization Code Flow with PKCE

**Rationale**: Most secure OAuth2 flow for web applications. PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks.

**Flow**:
1. User accesses protected route → Redirect to `/__auth/login`
2. Generate state + code_verifier → Store in session
3. Redirect to Google OAuth consent screen
4. User authenticates → Google redirects to `/__auth/callback`
5. Exchange code for tokens using code_verifier
6. Verify ID token, extract user info
7. Create session, redirect to original URL

**Reserved Routes**:
- `/__auth/login` - Initiates OAuth flow
- `/__auth/callback` - OAuth callback handler
- `/__logout` - Clears session and shows confirmation

## Config File Format

### Decision: JSON config at `.md-server-auth.json`

**Rationale**: JSON is familiar, requires no additional parsers, and aligns with common Node.js config patterns.

**Schema**:
```json
{
  "clientId": "string (required)",
  "clientSecret": "string (required)",
  "callbackUrl": "string (optional, default: auto-detect)",
  "allowedDomains": ["string"] (optional),
  "sessionSecret": "string (required)",
  "sessionMaxAge": "number (optional, default: 86400000 = 24h)"
}
```

**Validation Rules**:
- `clientId`: Non-empty string, starts with numeric ID
- `clientSecret`: Non-empty string
- `callbackUrl`: Valid URL or omitted for auto-detection
- `allowedDomains`: Array of non-empty strings (if provided)
- `sessionSecret`: Minimum 32 characters for security
- `sessionMaxAge`: Positive integer in milliseconds

## Error Handling Strategy

### Decision: Graceful degradation with user-friendly pages

**Error Pages**:
1. **Config Error** (startup): CLI exits with clear message, no server started
2. **Auth Denied**: User-friendly page explaining access was denied
3. **Auth Error**: Generic error page with "try again" option
4. **Domain Blocked**: Specific message if email domain not in allowlist

**Logging** (verbose mode):
- Login success: `[AUTH] User authenticated: email@domain.com`
- Login failure: `[AUTH] Authentication failed: <reason>`
- Logout: `[AUTH] User logged out: email@domain.com`
- Session expired: `[AUTH] Session expired for: email@domain.com`

## Security Considerations

### Implemented Protections

1. **CSRF Protection**: State parameter in OAuth flow
2. **PKCE**: Code verifier prevents code interception
3. **Secure Cookies**: `httpOnly`, `secure` (when HTTPS), `sameSite: lax`
4. **Token Validation**: Verify ID token signature and claims
5. **Domain Restriction**: Optional allowedDomains whitelist
6. **No Secrets in URLs**: Client secret only in server-side config

### Out of Scope (acceptable for docs server)

1. Token refresh (sessions are short-lived)
2. Rate limiting (low-traffic use case)
3. Persistent sessions (in-memory acceptable)
4. Multi-factor authentication (Google handles this)

## Dependencies Impact

### New Dependencies

| Package | Size (unpacked) | Weekly Downloads | Purpose |
|---------|-----------------|------------------|---------|
| google-auth-library | ~2.5MB | 8M+ | OAuth2 client |
| express-session | ~50KB | 4M+ | Session middleware |

### Total Impact

- Package size increase: ~2.6MB (acceptable for functionality added)
- No native dependencies (cross-platform compatible)
- Both packages actively maintained with security updates
