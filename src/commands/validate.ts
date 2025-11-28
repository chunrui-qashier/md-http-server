/**
 * T037-T042: Config file validation command
 * Phase 5 - User Story 3: md-http-server validate command
 */

import * as path from 'path';
import { loadConfigFile } from '../config/loader';
import { ValidationError, ValidationWarning, ServerConfig } from '../config/types';

/**
 * T037: Options for validate command
 */
export interface ValidateOptions {
  config: string;
  quiet: boolean;
}

/**
 * T037: Format a validation error with hint
 */
const formatError = (error: ValidationError): string => {
  const lineInfo = error.line ? ` (line ${error.line})` : '';
  let output = `  - ${error.field}: ${error.message}${lineInfo}`;
  if (error.hint) {
    output += `\n    Hint: ${error.hint}`;
  }
  return output;
};

/**
 * T037: Format a validation warning
 */
const formatWarning = (warning: ValidationWarning): string => {
  return `  - ${warning.field}: ${warning.message}`;
};

/**
 * T037: Count non-undefined/null settings recursively
 */
const countSettings = (config: Record<string, unknown>): number => {
  let count = 0;
  for (const value of Object.values(config)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        count += countSettings(value as Record<string, unknown>);
      } else {
        count++;
      }
    }
  }
  return count;
};

/**
 * T038: Display success message for valid config
 */
const displayValidConfig = (
  configPath: string,
  config: ServerConfig,
  envWarnings?: string[],
  warnings?: ValidationWarning[]
): void => {
  const settingsCount = countSettings(config as Record<string, unknown>);
  console.log(`✓ Config file is valid: ${configPath}`);
  console.log(`  ${settingsCount} settings configured`);

  // Show validation warnings if any
  if (warnings && warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log(formatWarning(w)));
  }

  // Show env var warnings
  if (envWarnings && envWarnings.length > 0) {
    console.log('\nEnvironment variable warnings:');
    envWarnings.forEach(w => console.log(`  - ${w}`));
  }
};

/**
 * T039: Display error message for invalid config
 */
const displayInvalidConfig = (
  configPath: string,
  errors: ValidationError[],
  warnings?: ValidationWarning[],
  envWarnings?: string[]
): void => {
  console.log(`✗ Config file has errors: ${configPath}`);

  console.log('\nErrors:');
  errors.forEach(e => console.log(formatError(e)));

  if (warnings && warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log(formatWarning(w)));
  }

  if (envWarnings && envWarnings.length > 0) {
    console.log('\nEnvironment variable warnings:');
    envWarnings.forEach(w => console.log(`  - ${w}`));
  }
};

/**
 * T040: Display errors in quiet mode
 */
const displayErrors = (errors: ValidationError[]): void => {
  errors.forEach(e => console.error(formatError(e)));
};

/**
 * Display load error (file not found, parse error)
 */
const displayError = (
  error: { message: string; line?: number; hint?: string }
): void => {
  console.log(`✗ ${error.message}`);
  if (error.hint) {
    console.log(`Hint: ${error.hint}`);
  }
};

/**
 * T037-T042: Main entry point for validate command
 */
export const runValidate = async (options: ValidateOptions): Promise<void> => {
  const configPath = path.resolve(options.config);

  // Load and validate config file
  const result = loadConfigFile(configPath);

  // Handle load errors (file not found, parse errors)
  if (result.error) {
    displayError(result.error);
    process.exit(1);
  }

  // Handle validation results
  const validation = result.validation!;
  const hasErrors = validation.errors.length > 0;

  // T040: Quiet mode - only show errors
  if (options.quiet) {
    if (hasErrors) {
      displayErrors(validation.errors);
      process.exit(1);
    }
    process.exit(0);
  }

  // Normal mode
  if (hasErrors) {
    // T039: Display invalid config with errors
    displayInvalidConfig(
      configPath,
      validation.errors,
      validation.warnings,
      result.envWarnings
    );
    process.exit(1);
  }

  // T038: Display valid config with settings count
  displayValidConfig(
    configPath,
    result.config!,
    result.envWarnings,
    validation.warnings
  );
  process.exit(0);
};
