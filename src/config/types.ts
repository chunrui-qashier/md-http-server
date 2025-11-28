// Config format constants (use const object, NOT enum per project rules)
export const CONFIG_FORMATS = {
  JSON: 'json',
  YAML: 'yaml',
} as const;

export type ConfigFormat = typeof CONFIG_FORMATS[keyof typeof CONFIG_FORMATS];

// Auth provider constants
export const AUTH_PROVIDERS = {
  GOOGLE: 'GOOGLE',
} as const;

export type AuthProvider = typeof AUTH_PROVIDERS[keyof typeof AUTH_PROVIDERS] | null;

// Setting types for validation
export const SETTING_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING_ARRAY: 'string[]',
} as const;

export type SettingType = typeof SETTING_TYPES[keyof typeof SETTING_TYPES];

// Auth configuration
export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
  allowedEmails?: string[];
  allowedDomains?: string[];
  callbackUrl?: string;
}

// Main server configuration
export interface ServerConfig {
  directory?: string;
  port?: number;
  verbose?: boolean;
  watch?: boolean;
  watchDebounce?: number;
  authProvider?: AuthProvider;
  authConfig?: AuthConfig;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  line?: number;
  hint?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Setting definition for interactive prompts
export type ValidatorFn = (value: unknown) => ValidationError | null;

export interface SettingDefinition {
  key: string;
  type: SettingType;
  description: string;
  defaultValue?: unknown;
  required?: boolean;
  validate?: ValidatorFn;
  dependsOn?: string;
}

// Config file representation
export interface ConfigFile {
  filePath: string;
  format: ConfigFormat;
  rawContent: string;
  parsedConfig: ServerConfig;
  validationResult: ValidationResult;
}
