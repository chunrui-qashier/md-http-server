/**
 * T014, T027, T029, T032, T033, T034: Auth middleware for protecting routes
 */
import { Request, Response, NextFunction } from 'express';
import { UserSession } from './types';

// Routes that bypass authentication
const BYPASS_ROUTES = [
  '/__auth/',
  '/__logout',
  '/__sse',
  '/api/live-reload',
];

/**
 * Check if a route should bypass authentication
 */
const shouldBypassAuth = (path: string): boolean => {
  return BYPASS_ROUTES.some(route => path.startsWith(route));
};

/**
 * Check if session is valid and not expired
 */
const isSessionValid = (user: UserSession | undefined): boolean => {
  if (!user) {
    return false;
  }
  return Date.now() < user.expiresAt;
};

export type AuthMiddlewareOptions = {
  verbose: boolean;
};

/**
 * Create auth middleware that protects all routes
 * T014: Block unauthenticated requests
 * T027: Redirect to /__auth/login
 * T029: Session expiration check
 * T032: Session logging for verbose mode
 * T033: Bypass auth for /__auth/* and /__logout
 * T034: Bypass auth for /__sse (live reload)
 */
export const createAuthMiddleware = (options: AuthMiddlewareOptions) => {
  const { verbose } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const requestPath = req.path;

    // T033, T034: Bypass authentication for specific routes
    if (shouldBypassAuth(requestPath)) {
      return next();
    }

    const user = req.session?.user;

    // T029: Check session expiration
    if (!isSessionValid(user)) {
      // T032: Log session expiration in verbose mode
      if (verbose && user) {
        console.log(`[AUTH] Session expired for: ${user.email}`);
      }

      // Clear expired session
      if (user) {
        req.session.user = undefined;
      }

      // T027: Redirect to login with return URL
      const returnUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/__auth/login?return=${returnUrl}`);
    }

    // T032: Add debug header in verbose mode
    if (verbose && user) {
      res.setHeader('X-Auth-User', user.email);
    }

    next();
  };
};
