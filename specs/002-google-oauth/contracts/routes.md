# Routes Contract: Google OAuth Integration

**Feature**: 002-google-oauth
**Date**: 2025-11-26

## Reserved Routes

All auth-related routes use `/__` prefix to avoid conflicts with user content.

---

### GET `/__auth/login`

Initiates the OAuth flow by redirecting to Google.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `return` | string | No | URL to redirect after auth (default: `/`) |

**Behavior**:
1. Generate CSRF state token
2. Generate PKCE code verifier and challenge
3. Store OAuthState in session
4. Redirect to Google OAuth consent URL

**Response**: 302 Redirect to `accounts.google.com`

**Errors**: None (always redirects)

---

### GET `/__auth/callback`

Handles the OAuth callback from Google.

**Query Parameters** (set by Google):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes* | Authorization code |
| `state` | string | Yes | CSRF state token |
| `error` | string | No* | Error code if auth failed |

*Either `code` or `error` will be present

**Behavior (success)**:
1. Validate state matches session
2. Exchange code for tokens using PKCE verifier
3. Verify ID token and extract user info
4. Check email domain against allowlist (if configured)
5. Create UserSession in session
6. Clear OAuthState from session
7. Redirect to original return URL

**Response (success)**: 302 Redirect to return URL

**Response (error)**: 302 Redirect to `/__auth/error?code=<ERROR_CODE>`

---

### GET `/__auth/error`

Displays user-friendly error page.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Error code from AUTH_ERROR_CODES |

**Response**: 200 OK with HTML error page

**Error Page Content**:
| Code | Title | Message |
|------|-------|---------|
| AUTH_DENIED | Access Denied | You denied access to your Google account |
| AUTH_FAILED | Authentication Failed | Something went wrong during authentication |
| DOMAIN_BLOCKED | Domain Not Allowed | Your email domain is not authorized |
| STATE_MISMATCH | Invalid Request | Please try logging in again |

---

### GET `/__logout`

Clears the user session and shows confirmation.

**Behavior**:
1. Destroy session
2. Clear session cookie
3. Log logout event (if verbose)
4. Display logout confirmation page

**Response**: 200 OK with HTML confirmation page

**Confirmation Page**:
- Message: "You have been logged out"
- Link: "Log in again" → `/__auth/login`

---

## Middleware Contract

### `authMiddleware`

Express middleware that protects all routes when auth is enabled.

**Bypass Routes** (never protected):
- `/__auth/*` - Auth flow routes
- `/__logout` - Logout route
- `/__sse` - Live reload SSE endpoint (if watching)

**Behavior**:
1. If no session or session expired → redirect to `/__auth/login?return=<current_url>`
2. If valid session → call `next()` and proceed to content

**Headers Added**:
| Header | Value | Purpose |
|--------|-------|---------|
| `X-Auth-User` | User email | Debugging (verbose mode only) |

---

## CLI Integration

### New CLI Options

```
--auth              Enable Google OAuth authentication
--auth-config <path> Path to auth config file (default: .md-server-auth.json)
```

**Validation on Startup**:
1. If `--auth` provided, config file MUST exist
2. Config file MUST be valid JSON
3. Config MUST pass schema validation
4. Exit with code 1 and clear message on any failure

**Exit Codes**:
| Code | Meaning |
|------|---------|
| 0 | Server started successfully |
| 1 | Configuration error (with message) |

---

## Config File Contract

### Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["clientId", "clientSecret", "sessionSecret"],
  "properties": {
    "clientId": {
      "type": "string",
      "minLength": 1,
      "description": "Google OAuth client ID"
    },
    "clientSecret": {
      "type": "string",
      "minLength": 1,
      "description": "Google OAuth client secret"
    },
    "callbackUrl": {
      "type": "string",
      "format": "uri",
      "description": "OAuth callback URL (auto-detected if omitted)"
    },
    "allowedDomains": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      },
      "description": "Whitelist of allowed email domains"
    },
    "sessionSecret": {
      "type": "string",
      "minLength": 32,
      "description": "Secret for signing session cookies"
    },
    "sessionMaxAge": {
      "type": "integer",
      "minimum": 1,
      "default": 86400000,
      "description": "Session duration in milliseconds"
    }
  }
}
```

### Validation Error Messages

| Condition | Message |
|-----------|---------|
| File not found | `Auth config file not found: <path>` |
| Invalid JSON | `Auth config file is not valid JSON: <parse_error>` |
| Missing clientId | `Auth config missing required field: clientId` |
| Missing clientSecret | `Auth config missing required field: clientSecret` |
| Missing sessionSecret | `Auth config missing required field: sessionSecret` |
| sessionSecret too short | `Auth config sessionSecret must be at least 32 characters` |
| Invalid callbackUrl | `Auth config callbackUrl is not a valid URL` |
| Invalid allowedDomains | `Auth config allowedDomains must be an array of strings` |
