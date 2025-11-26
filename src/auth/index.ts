/**
 * T010: Auth module exports barrel
 */
export {
  AuthConfig,
  UserSession,
  OAuthState,
  AuthError,
  AuthErrorCode,
  AUTH_ERROR_CODES,
} from './types';

export {
  loadAuthConfig,
  validateAuthConfig,
  isAllowedDomain,
  ConfigResult,
} from './config';
