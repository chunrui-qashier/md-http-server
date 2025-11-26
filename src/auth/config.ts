/**
 * Auth configuration loading and validation (pure functions per constitution)
 */
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { AuthConfig, AuthError, AUTH_ERROR_CODES } from './types';

// Default values
const DEFAULT_SESSION_MAX_AGE = 86400000; // 24 hours in milliseconds
const MIN_SESSION_SECRET_LENGTH = 32;

// Raw config from JSON file (before validation/defaults)
type RawAuthConfig = {
  clientId?: unknown;
  clientSecret?: unknown;
  callbackUrl?: unknown;
  allowedDomains?: unknown;
  sessionSecret?: unknown;
  sessionMaxAge?: unknown;
};

/**
 * Result type for config loading (FP pattern - no exceptions for expected failures)
 */
export type ConfigResult =
  | { success: true; config: AuthConfig }
  | { success: false; error: AuthError };

/**
 * T008: Load auth config from file path
 * Pure function: file path -> ConfigResult
 */
export const loadAuthConfig = (configPath: string, baseDir: string): ConfigResult => {
  const resolvedPath = path.isAbsolute(configPath)
    ? configPath
    : path.join(baseDir, configPath);

  // Check file exists
  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_MISSING,
        message: `Auth config file not found: ${resolvedPath}`,
        details: null,
      },
    };
  }

  // Read file
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_INVALID,
        message: `Failed to read auth config file: ${resolvedPath}`,
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // Parse JSON
  let rawConfig: RawAuthConfig;
  try {
    rawConfig = JSON.parse(rawContent) as RawAuthConfig;
  } catch (err) {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_INVALID,
        message: 'Auth config file is not valid JSON',
        details: err instanceof Error ? err.message : String(err),
      },
    };
  }

  // Validate and build config
  return validateAuthConfig(rawConfig);
};

/**
 * T009: Validate raw config and return typed AuthConfig
 * Pure function: raw config -> ConfigResult
 */
export const validateAuthConfig = (raw: RawAuthConfig): ConfigResult => {
  // Validate clientId
  if (typeof raw.clientId !== 'string' || raw.clientId.trim() === '') {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_INVALID,
        message: 'Auth config missing required field: clientId',
        details: null,
      },
    };
  }

  // Validate clientSecret
  if (typeof raw.clientSecret !== 'string' || raw.clientSecret.trim() === '') {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_INVALID,
        message: 'Auth config missing required field: clientSecret',
        details: null,
      },
    };
  }

  // Validate sessionSecret (optional - auto-generate if not provided)
  let sessionSecret: string;
  if (raw.sessionSecret === undefined || raw.sessionSecret === null || raw.sessionSecret === '') {
    // Auto-generate a secure session secret
    sessionSecret = randomBytes(32).toString('hex');
  } else if (typeof raw.sessionSecret !== 'string') {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_INVALID,
        message: 'Auth config sessionSecret must be a string',
        details: null,
      },
    };
  } else if (raw.sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    return {
      success: false,
      error: {
        code: AUTH_ERROR_CODES.CONFIG_INVALID,
        message: `Auth config sessionSecret must be at least ${MIN_SESSION_SECRET_LENGTH} characters`,
        details: null,
      },
    };
  } else {
    sessionSecret = raw.sessionSecret;
  }

  // Validate callbackUrl (optional)
  let callbackUrl: string | null = null;
  if (raw.callbackUrl !== undefined && raw.callbackUrl !== null) {
    if (typeof raw.callbackUrl !== 'string') {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.CONFIG_INVALID,
          message: 'Auth config callbackUrl must be a string',
          details: null,
        },
      };
    }
    try {
      new URL(raw.callbackUrl);
      callbackUrl = raw.callbackUrl;
    } catch {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.CONFIG_INVALID,
          message: 'Auth config callbackUrl is not a valid URL',
          details: null,
        },
      };
    }
  }

  // Validate allowedDomains (optional)
  let allowedDomains: ReadonlyArray<string> | null = null;
  if (raw.allowedDomains !== undefined && raw.allowedDomains !== null) {
    if (!Array.isArray(raw.allowedDomains)) {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.CONFIG_INVALID,
          message: 'Auth config allowedDomains must be an array of strings',
          details: null,
        },
      };
    }
    for (const domain of raw.allowedDomains) {
      if (typeof domain !== 'string' || domain.trim() === '') {
        return {
          success: false,
          error: {
            code: AUTH_ERROR_CODES.CONFIG_INVALID,
            message: 'Auth config allowedDomains must contain only non-empty strings',
            details: null,
          },
        };
      }
    }
    allowedDomains = raw.allowedDomains as ReadonlyArray<string>;
  }

  // Validate sessionMaxAge (optional)
  let sessionMaxAge = DEFAULT_SESSION_MAX_AGE;
  if (raw.sessionMaxAge !== undefined && raw.sessionMaxAge !== null) {
    if (typeof raw.sessionMaxAge !== 'number' || !Number.isInteger(raw.sessionMaxAge) || raw.sessionMaxAge <= 0) {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.CONFIG_INVALID,
          message: 'Auth config sessionMaxAge must be a positive integer',
          details: null,
        },
      };
    }
    sessionMaxAge = raw.sessionMaxAge;
  }

  // Build validated config
  const config: AuthConfig = {
    clientId: raw.clientId.trim(),
    clientSecret: raw.clientSecret.trim(),
    callbackUrl,
    allowedDomains,
    sessionSecret,
    sessionMaxAge,
  };

  return { success: true, config };
};

/**
 * T025: Check if email domain is allowed
 * Pure function: email, allowedDomains -> boolean
 */
export const isAllowedDomain = (email: string, allowedDomains: ReadonlyArray<string> | null): boolean => {
  // If no domain restriction, allow all
  if (allowedDomains === null || allowedDomains.length === 0) {
    return true;
  }

  // Extract domain from email
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) {
    return false;
  }

  const emailDomain = email.slice(atIndex + 1).toLowerCase();

  // Check against allowed domains (case-insensitive)
  return allowedDomains.some(domain => domain.toLowerCase() === emailDomain);
};
