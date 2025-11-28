/**
 * Config file loader with support for JSON and YAML formats.
 * Handles file detection, parsing, environment variable expansion, and validation.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ServerConfig, ConfigFormat, CONFIG_FORMATS, ValidationResult } from './types';
import { expandEnvVarsInObject } from './env';
import { validateConfig } from './validator';

/**
 * Result of loading a config file
 */
export interface LoadConfigResult {
  success: boolean;
  config?: ServerConfig;
  validation?: ValidationResult;
  error?: {
    message: string;
    line?: number;
    hint?: string;
  };
  envWarnings?: string[];
}

/**
 * T012: Detect config file format from file extension
 *
 * @param filePath - Path to config file
 * @returns Detected format (json or yaml)
 */
export const detectConfigFormat = (filePath: string): ConfigFormat => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return CONFIG_FORMATS.JSON;
  }

  if (ext === '.yaml' || ext === '.yml') {
    return CONFIG_FORMATS.YAML;
  }

  // Default to JSON if extension is unknown
  return CONFIG_FORMATS.JSON;
};

/**
 * T013: Parse JSON config file
 *
 * @param content - Raw file content
 * @returns Parsed config object or error with line number
 */
const parseJson = (content: string): { config?: Record<string, unknown>; error?: { message: string; line?: number } } => {
  try {
    const config = JSON.parse(content);
    return { config };
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Extract line number from error message
      const lineMatch = error.message.match(/position (\d+)/);
      let line: number | undefined;

      if (lineMatch) {
        const position = parseInt(lineMatch[1], 10);
        line = content.substring(0, position).split('\n').length;
      }

      return {
        error: {
          message: error.message,
          line,
        },
      };
    }

    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown JSON parse error',
      },
    };
  }
};

/**
 * T014: Parse YAML config file
 *
 * @param content - Raw file content
 * @returns Parsed config object or error with line number
 */
const parseYaml = (content: string): { config?: Record<string, unknown>; error?: { message: string; line?: number } } => {
  try {
    const config = yaml.load(content) as Record<string, unknown>;

    if (!config || typeof config !== 'object') {
      return {
        error: {
          message: 'YAML file must contain an object at root level',
        },
      };
    }

    return { config };
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      return {
        error: {
          message: error.message,
          line: error.mark?.line !== undefined ? error.mark.line + 1 : undefined,
        },
      };
    }

    return {
      error: {
        message: error instanceof Error ? error.message : 'Unknown YAML parse error',
      },
    };
  }
};

/**
 * T015, T019-T021: Load config file with env var expansion and validation
 *
 * @param filePath - Path to config file
 * @returns Load result with config, validation, and any errors/warnings
 */
export const loadConfigFile = (filePath: string): LoadConfigResult => {
  // T019: Error handling for missing config file
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: {
        message: `Config file not found: ${filePath}`,
        hint: "Check the file path or run 'md-http-server init' to create one",
      },
    };
  }

  // Read file content
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    return {
      success: false,
      error: {
        message: `Failed to read config file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        hint: 'Check file permissions',
      },
    };
  }

  // Detect format
  const format = detectConfigFormat(filePath);

  // T020: Parse config file with error handling
  let parsed: Record<string, unknown>;

  if (format === CONFIG_FORMATS.JSON) {
    const result = parseJson(content);
    if (result.error) {
      const lineInfo = result.error.line
        ? ` (line ${result.error.line})`
        : '';

      return {
        success: false,
        error: {
          message: `Failed to parse config file: ${filePath}`,
          line: result.error.line,
          hint: 'Validate your JSON syntax at jsonlint.com',
        },
      };
    }
    parsed = result.config!;
  } else {
    const result = parseYaml(content);
    if (result.error) {
      const lineInfo = result.error.line
        ? ` at line ${result.error.line}`
        : '';

      return {
        success: false,
        error: {
          message: `Failed to parse config file: ${filePath}`,
          line: result.error.line,
          hint: 'Check indentation uses consistent spaces (not tabs)',
        },
      };
    }
    parsed = result.config!;
  }

  // Expand environment variables
  const { result: expanded, warnings: envWarnings } = expandEnvVarsInObject(parsed);

  // Validate config
  const validation = validateConfig(expanded);

  return {
    success: validation.valid,
    config: expanded as ServerConfig,
    validation,
    envWarnings: envWarnings.length > 0 ? envWarnings : undefined,
  };
};
