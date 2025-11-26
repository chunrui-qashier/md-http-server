/**
 * T021-T023, T028, T030: OAuth routes for authentication flow
 */
import { Router, Request, Response } from 'express';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { AuthConfig, OAuthState, UserSession, AUTH_ERROR_CODES } from './types';
import { generateCodeVerifier, generateCodeChallenge } from './pkce';
import { generateStateToken } from './state';
import { isAllowedDomain } from './config';
import { getAuthErrorTemplate, getLogoutTemplate } from '../templates';

const OAUTH_STATE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Create OAuth routes
 */
export const createAuthRoutes = (config: AuthConfig, verbose: boolean) => {
  const router = Router();

  /**
   * Get OAuth2 client configured for this request
   */
  const getOAuth2Client = (req: Request): OAuth2Client => {
    const callbackUrl = config.callbackUrl || getCallbackUrl(req);
    return new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: callbackUrl,
    });
  };

  /**
   * Auto-detect callback URL from request
   */
  const getCallbackUrl = (req: Request): string => {
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers.host || 'localhost:3000';
    return `${protocol}://${host}/__auth/callback`;
  };

  /**
   * T021: GET /__auth/login - Initiate OAuth flow
   */
  router.get('/login', (req: Request, res: Response) => {
    const returnUrl = (req.query.return as string) || '/';
    const client = getOAuth2Client(req);

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Generate state token for CSRF protection
    const state = generateStateToken();

    // Store OAuth state in session
    const oauthState: OAuthState = {
      state,
      codeVerifier,
      returnUrl,
      createdAt: Date.now(),
    };
    req.session.oauth = oauthState;

    // Generate authorization URL
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });

    if (verbose) {
      console.log(`[AUTH] Redirecting to Google OAuth for: ${returnUrl}`);
    }

    res.redirect(authUrl);
  });

  /**
   * T022: GET /__auth/callback - Handle OAuth callback
   */
  router.get('/callback', async (req: Request, res: Response) => {
    const { code, state, error } = req.query;

    // Handle user denial or error from Google
    if (error) {
      if (verbose) {
        console.log(`[AUTH] Authentication denied: ${error}`);
      }
      return res.redirect(`/__auth/error?code=${AUTH_ERROR_CODES.AUTH_DENIED}`);
    }

    // Validate state parameter
    const oauthState = req.session.oauth;
    if (!oauthState || oauthState.state !== state) {
      if (verbose) {
        console.log('[AUTH] State mismatch - possible CSRF attack');
      }
      return res.redirect(`/__auth/error?code=${AUTH_ERROR_CODES.STATE_MISMATCH}`);
    }

    // Check OAuth state timeout
    if (Date.now() - oauthState.createdAt > OAUTH_STATE_TIMEOUT) {
      if (verbose) {
        console.log('[AUTH] OAuth state expired');
      }
      req.session.oauth = undefined;
      return res.redirect(`/__auth/error?code=${AUTH_ERROR_CODES.STATE_MISMATCH}`);
    }

    try {
      const client = getOAuth2Client(req);

      // Exchange code for tokens using PKCE verifier
      const { tokens } = await client.getToken({
        code: code as string,
        codeVerifier: oauthState.codeVerifier,
      });

      // Verify ID token and extract user info
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: config.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('No email in token payload');
      }

      // T025: Check domain restriction
      if (!isAllowedDomain(payload.email, config.allowedDomains)) {
        if (verbose) {
          console.log(`[AUTH] Domain blocked for: ${payload.email}`);
        }
        req.session.oauth = undefined;
        return res.redirect(`/__auth/error?code=${AUTH_ERROR_CODES.DOMAIN_BLOCKED}`);
      }

      // Create user session
      const userSession: UserSession = {
        email: payload.email,
        name: payload.name || null,
        picture: payload.picture || null,
        authenticatedAt: Date.now(),
        expiresAt: Date.now() + config.sessionMaxAge,
      };

      req.session.user = userSession;
      req.session.oauth = undefined; // Clear OAuth state

      if (verbose) {
        console.log(`[AUTH] User authenticated: ${userSession.email}`);
      }

      // T028: Redirect to original URL
      res.redirect(oauthState.returnUrl);

    } catch (err) {
      if (verbose) {
        console.error('[AUTH] Authentication failed:', err);
      }
      req.session.oauth = undefined;
      res.redirect(`/__auth/error?code=${AUTH_ERROR_CODES.AUTH_FAILED}`);
    }
  });

  /**
   * T023: GET /__auth/error - Display error page
   */
  router.get('/error', (req: Request, res: Response) => {
    const errorCode = (req.query.code as string) || AUTH_ERROR_CODES.AUTH_FAILED;
    const html = getAuthErrorTemplate(errorCode);
    res.status(403).send(html);
  });

  return router;
};

/**
 * T030: Create logout route
 */
export const createLogoutRoute = (verbose: boolean) => {
  return (req: Request, res: Response) => {
    const user = req.session?.user;

    // Destroy session
    req.session.destroy((err) => {
      if (err && verbose) {
        console.error('[AUTH] Error destroying session:', err);
      }

      if (verbose && user) {
        console.log(`[AUTH] User logged out: ${user.email}`);
      }

      const html = getLogoutTemplate();
      res.send(html);
    });
  };
};
