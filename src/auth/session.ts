/**
 * T013: Session middleware setup for authentication
 */
import session from 'express-session';
import { AuthConfig } from './types';

/**
 * Create session middleware configured for auth
 */
export const createSessionMiddleware = (config: AuthConfig) => {
  return session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: 'auto', // Auto-detect HTTPS
      httpOnly: true,
      sameSite: 'lax',
      maxAge: config.sessionMaxAge,
    },
    name: 'md-server.sid',
  });
};
