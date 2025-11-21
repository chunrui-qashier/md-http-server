#!/usr/bin/env node

import { Command } from 'commander';
import { createServer } from './server';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

program
  .name('md-http-server')
  .description('A simple HTTP server for rendering markdown files')
  .version(packageJson.version)
  .argument('[directory]', 'Directory to serve (defaults to current directory)', '.')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('-w, --watch', 'Enable live reload when markdown files change', false)
  .option('--watch-debounce <ms>', 'Debounce delay for file changes in milliseconds', '500')
  .action(async (directory: string, options: { port: string; verbose: boolean; watch: boolean; watchDebounce: string }) => {
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

      const server = createServer({
        port,
        directory: resolvedDirectory,
        verbose: options.verbose,
        watch: options.watch,
        watchDebounce,
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
