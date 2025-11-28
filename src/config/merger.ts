/**
 * T016: Config merger - combines default config, config file, and CLI args
 * Merge order: defaults → config file → CLI args (later values override earlier)
 */

import { ServerConfig, AuthProvider } from './types';

/**
 * Default configuration values
 */
export const CONFIG_DEFAULTS: Partial<ServerConfig> = {
  directory: '.',
  port: 3000,
  verbose: false,
  watch: false,
  watchDebounce: 500,
  authProvider: null,
};

/**
 * CLI options interface for type safety
 */
export interface CliConfigOptions {
  directory?: string;
  port?: number;
  verbose?: boolean;
  watch?: boolean;
  watchDebounce?: number;
  auth?: boolean;
  authConfig?: string;
  config?: string;
}

/**
 * Merge multiple config objects with proper precedence
 * Later configs override earlier ones
 *
 * @param configs - Array of partial configs to merge
 * @returns Merged server config
 */
export const mergeConfigs = (...configs: Partial<ServerConfig>[]): ServerConfig => {
  const merged: Partial<ServerConfig> = {};

  for (const config of configs) {
    // Merge top-level fields
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        if (key === 'authConfig' && typeof value === 'object' && value !== null) {
          // Deep merge authConfig
          merged.authConfig = {
            ...merged.authConfig,
            ...value,
          };
        } else {
          (merged as Record<string, unknown>)[key] = value;
        }
      }
    }
  }

  return merged as ServerConfig;
};

/**
 * Convert CLI options to ServerConfig format
 * Only includes options that were explicitly specified
 *
 * @param options - CLI options from commander
 * @returns Partial server config with only specified values
 */
export const cliOptionsToConfig = (options: CliConfigOptions): Partial<ServerConfig> => {
  const config: Partial<ServerConfig> = {};

  // Map CLI options to config fields
  if (options.directory !== undefined) {
    config.directory = options.directory;
  }

  if (options.port !== undefined) {
    config.port = options.port;
  }

  if (options.verbose !== undefined) {
    config.verbose = options.verbose;
  }

  if (options.watch !== undefined) {
    config.watch = options.watch;
  }

  if (options.watchDebounce !== undefined) {
    config.watchDebounce = options.watchDebounce;
  }

  // Handle auth flag: --auth maps to authProvider: 'GOOGLE'
  if (options.auth === true) {
    config.authProvider = 'GOOGLE' as AuthProvider;
  } else if (options.auth === false) {
    config.authProvider = null;
  }

  return config;
};
