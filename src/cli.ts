#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from './server';
import * as path from 'path';
import * as fs from 'fs';
import { loadAuthConfig, AuthConfig } from './auth';

const program = new Command();

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// T011: CLI options interface with auth
interface CliOptions {
  port: string;
  verbose: boolean;
  watch: boolean;
  watchDebounce: string;
  auth: boolean;
  authConfig: string;
}

program
  .name('md-http-server')
  .description('A simple HTTP server for rendering markdown files')
  .version(packageJson.version)
  .argument('[directory]', 'Directory to serve (defaults to current directory)', '.')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-w, --watch', 'Enable live reload when markdown files change', false)
  .option('--watch-debounce <ms>', 'Debounce delay for file changes in milliseconds', '500')
  .option('--auth', 'Enable Google OAuth authentication', false)
  .option('--auth-config <path>', 'Path to auth config file', '.md-server-auth.json')
  .action(async (directory: string, options: CliOptions) => {
    try {
      const port = parseInt(options.port, 10);

      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Error: Port must be a number between 1 and 65535');
        process.exit(1);
      }

      const watchDebounce = parseInt(options.watchDebounce, 10);
      if (isNaN(watchDebounce) || watchDebounce < 0) {
        console.error('Error: Watch debounce must be a non-negative number');
        process.exit(1);
      }

      const resolvedDirectory = path.resolve(directory);

      // Check if directory exists
      if (!fs.existsSync(resolvedDirectory)) {
        console.error(`Error: Directory does not exist: ${resolvedDirectory}`);
        process.exit(1);
      }

      if (!fs.statSync(resolvedDirectory).isDirectory()) {
        console.error(`Error: Path is not a directory: ${resolvedDirectory}`);
        process.exit(1);
      }

      // T012, T018: Load and validate auth config if --auth is enabled
      let authConfig: AuthConfig | undefined;
      if (options.auth) {
        const configResult = loadAuthConfig(options.authConfig, resolvedDirectory);
        if (!configResult.success) {
          console.error(`Error: ${configResult.error.message}`);
          if (configResult.error.details) {
            console.error(`  Details: ${configResult.error.details}`);
          }
          process.exit(1);
        }
        authConfig = configResult.config;
      }

      const server = createServer({
        port,
        directory: resolvedDirectory,
        verbose: options.verbose,
        watch: options.watch,
        watchDebounce,
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

program.parse();
