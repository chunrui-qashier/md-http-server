export { createServer, ServerOptions } from './server';
export { getMarkdownTemplate, getDirectoryTemplate } from './templates';

// T037: Export auth types for programmatic usage
export {
  AuthConfig,
  UserSession,
  OAuthState,
  AuthError,
  AUTH_ERROR_CODES,
  AuthErrorCode,
  ConfigResult,
} from './auth';
export { loadAuthConfig, validateAuthConfig, isAllowedDomain } from './auth/config';
