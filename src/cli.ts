#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from './server';
import * as path from 'path';
import * as fs from 'fs';
import { loadAuthConfig, AuthConfig as ServerAuthConfig } from './auth';
import { loadConfigFile, mergeConfigs, cliOptionsToConfig, CONFIG_DEFAULTS } from './config';
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';

const program = new Command();

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// T017: CLI options interface with config option
interface CliOptions {
  port: string;
  verbose: boolean;
  watch: boolean;
  watchDebounce: string;
  auth: boolean;
  authConfig: string;
  config?: string;  // T017: New --config option
}

program
  .name('md-http-server')
  .description('A simple HTTP server for rendering markdown files')
  .version(packageJson.version)
  .enablePositionalOptions()
  .argument('[directory]', 'Directory to serve (defaults to current directory)', '.')
  .option('-c, --config <path>', 'Path to config file (JSON or YAML)')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-w, --watch', 'Enable live reload when markdown files change', false)
  .option('--watch-debounce <ms>', 'Debounce delay for file changes in milliseconds', '500')
  .option('--auth', 'Enable Google OAuth authentication', false)
  .option('--auth-config <path>', 'Path to auth config file', '.md-server-auth.json')
  .action(async (directory: string, options: CliOptions) => {
    try {
      // T018: Load config file if --config is provided
      let fileConfig = {};
      let envWarnings: string[] = [];

      if (options.config) {
        const configPath = path.resolve(options.config);
        const loadResult = loadConfigFile(configPath);

        if (!loadResult.success) {
          console.error(`Error: ${loadResult.error!.message}`);
          if (loadResult.error!.line !== undefined) {
            console.error(`  at line ${loadResult.error!.line}`);
          }
          if (loadResult.error!.hint) {
            console.error(`Hint: ${loadResult.error!.hint}`);
          }
          process.exit(1);
        }

        fileConfig = loadResult.config || {};
        envWarnings = loadResult.envWarnings || [];

        // Display validation warnings
        if (loadResult.validation?.warnings.length) {
          console.warn('\nWarnings:');
          for (const warning of loadResult.validation.warnings) {
            console.warn(`  ${warning.field}: ${warning.message}`);
          }
        }

        // Display environment variable warnings
        if (envWarnings.length > 0) {
          console.warn('\nEnvironment Variable Warnings:');
          for (const warning of envWarnings) {
            console.warn(`  ${warning}`);
          }
        }
      }

      // Convert CLI options to config format
      const port = parseInt(options.port, 10);
      const watchDebounce = parseInt(options.watchDebounce, 10);

      const cliConfig = cliOptionsToConfig({
        directory: directory !== '.' ? directory : undefined,
        port: options.port !== '3000' ? port : undefined,
        verbose: options.verbose || undefined,
        watch: options.watch || undefined,
        watchDebounce: options.watchDebounce !== '500' ? watchDebounce : undefined,
        auth: options.auth || undefined,
      });

      // T018: Merge configs: defaults → file config → CLI args
      const mergedConfig = mergeConfigs(CONFIG_DEFAULTS, fileConfig, cliConfig);

      // Validate merged config values
      if (isNaN(mergedConfig.port!) || mergedConfig.port! < 1 || mergedConfig.port! > 65535) {
        console.error('Error: Port must be a number between 1 and 65535');
        process.exit(1);
      }

      if (isNaN(mergedConfig.watchDebounce!) || mergedConfig.watchDebounce! < 0) {
        console.error('Error: Watch debounce must be a non-negative number');
        process.exit(1);
      }

      const resolvedDirectory = path.resolve(mergedConfig.directory!);

      // Check if directory exists
      if (!fs.existsSync(resolvedDirectory)) {
        console.error(`Error: Directory does not exist: ${resolvedDirectory}`);
        process.exit(1);
      }

      if (!fs.statSync(resolvedDirectory).isDirectory()) {
        console.error(`Error: Path is not a directory: ${resolvedDirectory}`);
        process.exit(1);
      }

      // Handle auth config - backward compatibility with --auth flag
      let authConfig: ServerAuthConfig | undefined;

      if (mergedConfig.authProvider === 'GOOGLE') {
        // If authConfig is in merged config (from config file), convert it
        if (mergedConfig.authConfig) {
          const cfg = mergedConfig.authConfig;
          authConfig = {
            clientId: cfg.clientId,
            clientSecret: cfg.clientSecret,
            sessionSecret: cfg.sessionSecret,
            callbackUrl: cfg.callbackUrl || null,
            allowedDomains: cfg.allowedDomains || null,
            sessionMaxAge: 24 * 60 * 60 * 1000, // Default: 24 hours
          };
        } else if (options.auth) {
          // Fallback to loading from --auth-config file (backward compatibility)
          const configResult = loadAuthConfig(options.authConfig, resolvedDirectory);
          if (!configResult.success) {
            console.error(`Error: ${configResult.error.message}`);
            if (configResult.error.details) {
              console.error(`  Details: ${configResult.error.details}`);
            }
            process.exit(1);
          }
          authConfig = configResult.config;
        } else {
          console.error('Error: authConfig is required when authProvider is set to GOOGLE');
          process.exit(1);
        }
      }

      const server = createServer({
        port: mergedConfig.port!,
        directory: resolvedDirectory,
        verbose: mergedConfig.verbose,
        watch: mergedConfig.watch,
        watchDebounce: mergedConfig.watchDebounce,
        authConfig,
      });

      await server.start();

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\nShutting down server...');
        server.cleanup();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\n\nShutting down server...');
        server.cleanup();
        process.exit(0);
      });

    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// T035: Add init subcommand for interactive config generation
program
  .command('init')
  .description('Create a configuration file interactively')
  .option('-o, --output <path>', 'Output file path', 'md-server.config.json')
  .option('-f, --format <format>', 'Output format (json/yaml/auto)', 'auto')
  .option('-y, --yes', 'Accept all defaults (non-interactive)', false)
  .action(async (options: { output: string; format: string; yes: boolean }) => {
    try {
      await runInit({
        output: options.output,
        format: options.format as 'json' | 'yaml' | 'auto',
        yes: options.yes,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// T041: Add validate subcommand for config file validation
program
  .command('validate')
  .description('Validate a configuration file')
  .requiredOption('-c, --config <path>', 'Path to config file to validate')
  .option('-q, --quiet', 'Only show errors (for CI/CD)', false)
  .action(async (options: { config: string; quiet: boolean }) => {
    try {
      await runValidate(options);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();
