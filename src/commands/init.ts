/**
 * T022-T034: Interactive config file generator
 * Phase 4 - User Story 2: md-http-server init command
 */

import { input, confirm, select, password } from '@inquirer/prompts';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import { ServerConfig, AUTH_PROVIDERS, CONFIG_FORMATS, ConfigFormat } from '../config/types';
import { CONFIG_DEFAULTS } from '../config/merger';

// T022: Init command options
export interface InitOptions {
  output: string;
  format: 'json' | 'yaml' | 'auto';
  yes: boolean;
}

// Access control options for auth flow
const ACCESS_CONTROL_OPTIONS = {
  ANYONE: 'anyone',
  EMAILS_ONLY: 'emails',
  DOMAINS_ONLY: 'domains',
  BOTH: 'both',
} as const;

type AccessControlType = typeof ACCESS_CONTROL_OPTIONS[keyof typeof ACCESS_CONTROL_OPTIONS];

/**
 * T023: Show welcome banner
 */
const showWelcomeBanner = (): void => {
  console.log('\n');
  console.log('🔧 md-http-server Configuration Generator');
  console.log('');
  console.log('This wizard will help you create a configuration file.');
  console.log('Press Ctrl+C at any time to cancel.');
  console.log('');
};

/**
 * T033: Show summary after successful config creation
 */
const showSummary = (outputPath: string): void => {
  console.log('\n');
  console.log(`✓ Configuration saved to ${outputPath}`);
  console.log('');
  console.log('To start your server, run:');
  console.log(`  md-http-server --config ${outputPath}`);
  console.log('');
};

/**
 * T029: Generate a secure session secret
 */
const generateSessionSecret = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * T034: Check if error is user cancellation (Ctrl+C)
 */
const isUserCancellation = (error: unknown): boolean => {
  // @inquirer/prompts throws an error with name 'ExitPromptError' on Ctrl+C
  return error instanceof Error && error.name === 'ExitPromptError';
};

/**
 * T032: Detect config format from file extension
 */
const detectFormatFromPath = (filePath: string, formatOption: string): ConfigFormat => {
  if (formatOption !== 'auto') {
    return formatOption as ConfigFormat;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.yaml' || ext === '.yml') {
    return CONFIG_FORMATS.YAML;
  }
  return CONFIG_FORMATS.JSON;
};

/**
 * T032: Write config to file in appropriate format
 */
const writeConfigFile = (config: ServerConfig, filePath: string, format: ConfigFormat): void => {
  let content: string;

  if (format === CONFIG_FORMATS.YAML) {
    content = yaml.dump(config, { indent: 2, noRefs: true });
  } else {
    content = JSON.stringify(config, null, 2);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
};

/**
 * T030-T031: Prompt for output file path with overwrite handling
 */
const promptOutputPath = async (defaultPath: string): Promise<string> => {
  let outputPath = await input({
    message: 'Output file path',
    default: defaultPath,
    validate: (value: string) => {
      if (!value.trim()) {
        return 'Output path cannot be empty';
      }
      return true;
    },
  });

  outputPath = path.resolve(outputPath);

  // T031: Check if file exists and prompt for overwrite
  if (fs.existsSync(outputPath)) {
    const overwrite = await confirm({
      message: `File ${outputPath} already exists. Overwrite?`,
      default: false,
    });

    if (!overwrite) {
      // Prompt for new filename
      const newPath = await input({
        message: 'Enter a new filename',
        default: outputPath,
        validate: (value: string) => {
          if (!value.trim()) {
            return 'Filename cannot be empty';
          }
          return true;
        },
      });
      outputPath = path.resolve(newPath);
    }
  }

  return outputPath;
};

/**
 * T024-T029: Collect all settings through interactive prompts
 */
const collectSettings = async (): Promise<ServerConfig> => {
  const config: ServerConfig = {};

  // T024: Basic Settings
  config.directory = await input({
    message: 'Directory to serve',
    default: '.',
  });

  const portStr = await input({
    message: 'Server port',
    default: '3000',
    validate: (value: string) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 65535) {
        return 'Port must be between 1 and 65535';
      }
      return true;
    },
  });
  config.port = parseInt(portStr, 10);

  // T025: Developer Experience - Live Reload
  const enableWatch = await confirm({
    message: 'Enable live reload?',
    default: false,
  });
  config.watch = enableWatch;

  // T025: Conditional - Watch Debounce (only if live reload enabled)
  if (enableWatch) {
    const debounceStr = await input({
      message: 'Watch debounce in ms',
      default: '500',
      validate: (value: string) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num < 0) {
          return 'Debounce must be a non-negative number';
        }
        return true;
      },
    });
    config.watchDebounce = parseInt(debounceStr, 10);
  }

  // T025: Verbose Logging
  config.verbose = await confirm({
    message: 'Enable verbose logging?',
    default: false,
  });

  // T026: Authentication
  const authChoice = await select({
    message: 'Protect with authentication?',
    choices: [
      { value: 'none', name: 'No, keep it open' },
      { value: 'google', name: 'Yes, use Google OAuth' },
    ],
  });

  if (authChoice === 'google') {
    config.authProvider = AUTH_PROVIDERS.GOOGLE;

    // T027: OAuth credentials
    const clientId = await input({
      message: 'Google OAuth Client ID',
      validate: (value: string) => {
        if (!value.trim()) {
          return 'Client ID is required';
        }
        return true;
      },
    });

    const clientSecret = await password({
      message: 'Google OAuth Client Secret',
      mask: '*',
      validate: (value: string) => {
        if (!value.trim()) {
          return 'Client Secret is required';
        }
        return true;
      },
    });

    // T029: Session Secret - Auto-generate or custom
    const sessionChoice = await select({
      message: 'Session Secret',
      choices: [
        { value: 'auto', name: 'Auto-generate (recommended)' },
        { value: 'custom', name: 'Enter custom secret' },
      ],
    });

    let sessionSecret: string;
    if (sessionChoice === 'auto') {
      sessionSecret = generateSessionSecret();
      console.log(`  Generated session secret: ${sessionSecret}`);
    } else {
      sessionSecret = await password({
        message: 'Enter session secret',
        mask: '*',
        validate: (value: string) => {
          if (!value.trim()) {
            return 'Session secret is required';
          }
          if (value.length < 32) {
            return 'Session secret should be at least 32 characters for security';
          }
          return true;
        },
      });
    }

    // T028: Access Control
    const accessControl = await select<AccessControlType>({
      message: 'Who should have access?',
      choices: [
        { value: ACCESS_CONTROL_OPTIONS.ANYONE, name: 'Anyone with a Google account' },
        { value: ACCESS_CONTROL_OPTIONS.EMAILS_ONLY, name: 'Only specific email addresses' },
        { value: ACCESS_CONTROL_OPTIONS.DOMAINS_ONLY, name: 'Only specific domains' },
        { value: ACCESS_CONTROL_OPTIONS.BOTH, name: 'Both specific emails and domains' },
      ],
    });

    config.authConfig = {
      clientId,
      clientSecret,
      sessionSecret,
    };

    // T028: Conditional prompts based on access control choice
    if (accessControl === ACCESS_CONTROL_OPTIONS.EMAILS_ONLY || accessControl === ACCESS_CONTROL_OPTIONS.BOTH) {
      const emailsStr = await input({
        message: 'Allowed email addresses (comma-separated)',
        validate: (value: string) => {
          if (!value.trim()) {
            return 'At least one email address is required';
          }
          return true;
        },
      });
      config.authConfig.allowedEmails = emailsStr.split(',').map(e => e.trim()).filter(e => e.length > 0);
    }

    if (accessControl === ACCESS_CONTROL_OPTIONS.DOMAINS_ONLY || accessControl === ACCESS_CONTROL_OPTIONS.BOTH) {
      const domainsStr = await input({
        message: 'Allowed domains (comma-separated)',
        validate: (value: string) => {
          if (!value.trim()) {
            return 'At least one domain is required';
          }
          return true;
        },
      });
      config.authConfig.allowedDomains = domainsStr.split(',').map(d => d.trim()).filter(d => d.length > 0);
    }
  } else {
    config.authProvider = null;
  }

  return config;
};

/**
 * T036: Non-interactive mode - use all defaults
 */
const runNonInteractive = async (options: InitOptions): Promise<void> => {
  console.log('Creating configuration with default values...');

  // Create minimal config with defaults
  const config: ServerConfig = {
    directory: CONFIG_DEFAULTS.directory,
    port: CONFIG_DEFAULTS.port,
    verbose: CONFIG_DEFAULTS.verbose,
    watch: CONFIG_DEFAULTS.watch,
    watchDebounce: CONFIG_DEFAULTS.watchDebounce,
    authProvider: CONFIG_DEFAULTS.authProvider,
  };

  const outputPath = path.resolve(options.output);
  const format = detectFormatFromPath(outputPath, options.format);

  // T032: Write config file
  writeConfigFile(config, outputPath, format);

  // T033: Show summary
  showSummary(outputPath);
};

/**
 * Interactive mode - full wizard flow
 */
const runInteractive = async (options: InitOptions): Promise<void> => {
  // T023: Show welcome banner
  showWelcomeBanner();

  // T024-T029: Collect all settings
  const config = await collectSettings();

  // T030-T031: Get output path
  const outputPath = await promptOutputPath(options.output);

  // T032: Detect format and write config file
  const format = detectFormatFromPath(outputPath, options.format);
  writeConfigFile(config, outputPath, format);

  // T033: Show summary
  showSummary(outputPath);
};

/**
 * T022: Main entry point for init command
 */
export const runInit = async (options: InitOptions): Promise<void> => {
  try {
    // T036: Check for --yes flag
    if (options.yes) {
      return await runNonInteractive(options);
    }

    // Interactive mode
    return await runInteractive(options);
  } catch (error) {
    // T034: Handle Ctrl+C gracefully
    if (isUserCancellation(error)) {
      console.log('\n\nConfiguration cancelled. No files were created.');
      process.exit(0);
    }
    // Re-throw other errors
    throw error;
  }
};
