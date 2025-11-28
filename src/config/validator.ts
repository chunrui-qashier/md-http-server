import { ValidationError, ValidationWarning, ValidationResult, ServerConfig, AUTH_PROVIDERS } from './types';

const KNOWN_FIELDS = new Set([
  'directory', 'port', 'verbose', 'watch', 'watchDebounce',
  'authProvider', 'authConfig'
]);

const KNOWN_AUTH_FIELDS = new Set([
  'clientId', 'clientSecret', 'sessionSecret',
  'allowedEmails', 'allowedDomains', 'callbackUrl'
]);

export const validatePort = (port: unknown): ValidationError | null => {
  if (typeof port !== 'number') {
    return {
      field: 'port',
      message: `Invalid type: expected number, got ${typeof port}`,
      hint: 'Use a number like 3000, not "3000"',
    };
  }
  if (!Number.isInteger(port)) {
    return {
      field: 'port',
      message: 'Port must be an integer',
      hint: 'Use a whole number like 3000',
    };
  }
  if (port < 1 || port > 65535) {
    return {
      field: 'port',
      message: `Port ${port} is out of range`,
      hint: 'Use a port between 1 and 65535',
    };
  }
  return null;
};

export const validateDirectory = (directory: unknown): ValidationError | null => {
  if (typeof directory !== 'string') {
    return {
      field: 'directory',
      message: `Invalid type: expected string, got ${typeof directory}`,
      hint: 'Use a path like "." or "./docs"',
    };
  }
  return null;
};

export const validateWatchDebounce = (debounce: unknown): ValidationError | null => {
  if (typeof debounce !== 'number') {
    return {
      field: 'watchDebounce',
      message: `Invalid type: expected number, got ${typeof debounce}`,
      hint: 'Use a number in milliseconds like 500',
    };
  }
  if (!Number.isInteger(debounce) || debounce < 0) {
    return {
      field: 'watchDebounce',
      message: 'Watch debounce must be a non-negative integer',
      hint: 'Use a value like 500 (milliseconds)',
    };
  }
  return null;
};

export const validateAuthConfig = (
  authProvider: unknown,
  authConfig: unknown
): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (authProvider === null || authProvider === undefined) {
    return errors;
  }

  if (authProvider !== AUTH_PROVIDERS.GOOGLE) {
    errors.push({
      field: 'authProvider',
      message: `Unknown auth provider: ${authProvider}`,
      hint: 'Use "GOOGLE" or remove authProvider to disable auth',
    });
    return errors;
  }

  if (!authConfig || typeof authConfig !== 'object') {
    errors.push({
      field: 'authConfig',
      message: 'authConfig is required when authProvider is set',
      hint: 'Add authConfig with clientId, clientSecret, and sessionSecret',
    });
    return errors;
  }

  const config = authConfig as Record<string, unknown>;

  if (!config.clientId || typeof config.clientId !== 'string') {
    errors.push({
      field: 'authConfig.clientId',
      message: 'clientId is required when authProvider is set',
      hint: 'Add your Google OAuth client ID',
    });
  }

  if (!config.clientSecret || typeof config.clientSecret !== 'string') {
    errors.push({
      field: 'authConfig.clientSecret',
      message: 'clientSecret is required when authProvider is set',
      hint: 'Add your Google OAuth client secret',
    });
  }

  if (!config.sessionSecret || typeof config.sessionSecret !== 'string') {
    errors.push({
      field: 'authConfig.sessionSecret',
      message: 'sessionSecret is required when authProvider is set',
      hint: 'Add a session secret for cookie encryption',
    });
  }

  return errors;
};

export const findUnknownFields = (
  config: Record<string, unknown>
): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];

  for (const key of Object.keys(config)) {
    if (!KNOWN_FIELDS.has(key)) {
      warnings.push({
        field: key,
        message: `Unknown field "${key}" will be ignored`,
      });
    }
  }

  if (config.authConfig && typeof config.authConfig === 'object') {
    for (const key of Object.keys(config.authConfig as Record<string, unknown>)) {
      if (!KNOWN_AUTH_FIELDS.has(key)) {
        warnings.push({
          field: `authConfig.${key}`,
          message: `Unknown field "authConfig.${key}" will be ignored`,
        });
      }
    }
  }

  return warnings;
};

export const validateConfig = (config: Record<string, unknown>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validate known fields
  if (config.port !== undefined) {
    const error = validatePort(config.port);
    if (error) errors.push(error);
  }

  if (config.directory !== undefined) {
    const error = validateDirectory(config.directory);
    if (error) errors.push(error);
  }

  if (config.watchDebounce !== undefined) {
    const error = validateWatchDebounce(config.watchDebounce);
    if (error) errors.push(error);
  }

  // Validate auth
  const authErrors = validateAuthConfig(config.authProvider, config.authConfig);
  errors.push(...authErrors);

  // Check for authConfig without authProvider
  if (!config.authProvider && config.authConfig) {
    warnings.push({
      field: 'authConfig',
      message: 'authConfig is set but authProvider is not - auth config will be ignored',
    });
  }

  // Find unknown fields
  warnings.push(...findUnknownFields(config));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};
