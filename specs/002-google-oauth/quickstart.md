# Quickstart: Google OAuth Integration

**Feature**: 002-google-oauth
**Date**: 2025-11-26

## Prerequisites

1. **Google Cloud Project** with OAuth 2.0 credentials
2. **Node.js 18+** installed
3. **md-http-server** installed or available via npx

## Setup Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URI:
   - For local development: `http://localhost:3000/__auth/callback`
   - For production: `https://your-domain.com/__auth/callback`
7. Copy the **Client ID** and **Client Secret**

## Create Config File

Create `.md-server-auth.json` in your documentation directory:

```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "sessionSecret": "generate-a-random-string-at-least-32-chars"
}
```

### Generate Session Secret

```bash
# macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Run with Authentication

```bash
# Using npx
npx md-http-server --auth ./docs

# With custom config path
npx md-http-server --auth --auth-config ./config/auth.json ./docs

# With verbose logging
npx md-http-server --auth -v ./docs
```

## Verify Setup

1. Open `http://localhost:3000` in browser
2. You should be redirected to Google login
3. After authenticating, you'll see your markdown content
4. Visit `http://localhost:3000/__logout` to log out

## Optional: Restrict to Specific Domains

Add `allowedDomains` to only allow certain email domains:

```json
{
  "clientId": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "clientSecret": "YOUR_CLIENT_SECRET",
  "sessionSecret": "your-32-char-secret",
  "allowedDomains": ["company.com", "partner.org"]
}
```

Users with emails outside these domains will see an error page.

## Optional: Custom Session Duration

Default session lasts 24 hours. Customize with `sessionMaxAge` (in milliseconds):

```json
{
  "clientId": "...",
  "clientSecret": "...",
  "sessionSecret": "...",
  "sessionMaxAge": 3600000
}
```

Common values:
- 1 hour: `3600000`
- 8 hours: `28800000`
- 24 hours: `86400000` (default)
- 7 days: `604800000`

## Troubleshooting

### "Auth config file not found"

Ensure the config file exists at the specified path (default: `.md-server-auth.json` in served directory).

### "redirect_uri_mismatch" from Google

Add the correct callback URL to your Google OAuth credentials:
- Check the port number matches your server
- Ensure protocol (http/https) matches
- The path must be exactly `/__auth/callback`

### "Domain Not Allowed" error

Your email domain isn't in the `allowedDomains` list. Either:
- Add your domain to the list
- Remove `allowedDomains` to allow all domains

### Session lost after server restart

This is expected behavior. Sessions are stored in memory and cleared when the server restarts.

## Security Notes

1. **Never commit** `.md-server-auth.json` to version control
2. Add to `.gitignore`:
   ```
   .md-server-auth.json
   ```
3. Use HTTPS in production for secure cookies
4. Rotate `sessionSecret` periodically
