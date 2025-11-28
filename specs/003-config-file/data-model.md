# Data Model: Config File Support

**Feature**: 003-config-file
**Date**: 2025-11-28

## Entities

### ConfigFile

Represents a configuration file loaded from disk.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filePath` | string | Yes | Absolute path to the config file |
| `format` | ConfigFormat | Yes | Detected format (JSON or YAML) |
| `rawContent` | string | Yes | Raw file content before parsing |
| `parsedConfig` | ServerConfig | Yes | Parsed and validated configuration |
| `validationResult` | ValidationResult | Yes | Result of validation |

### ServerConfig

Main configuration object matching CLI options.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `directory` | string | No | `.` | Directory to serve |
| `port` | number | No | `3000` | Server port (1-65535) |
| `verbose` | boolean | No | `false` | Enable verbose logging |
| `watch` | boolean | No | `false` | Enable live reload |
| `watchDebounce` | number | No | `500` | Debounce delay in ms |
| `authProvider` | AuthProvider | No | `null` | OAuth provider to use (null = disabled) |
| `authConfig` | AuthConfig | Conditional | - | Provider-specific auth settings (required if authProvider is set) |

### AuthProvider

Indicates which OAuth provider to use for authentication.

```typescript
const AUTH_PROVIDERS = {
  GOOGLE: 'GOOGLE',
} as const;

type AuthProvider = typeof AUTH_PROVIDERS[keyof typeof AUTH_PROVIDERS] | null;
```

| Value | Description |
|-------|-------------|
| `null` | Authentication disabled (default) |
| `'GOOGLE'` | Google OAuth authentication |

**Extensibility**: Future providers (e.g., `'GITHUB'`, `'AZURE_AD'`) can be added to this type.

### AuthConfig

Provider-specific authentication configuration. Required when `authProvider` is not null.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `clientId` | string | Yes | - | OAuth client ID |
| `clientSecret` | string | Yes | - | OAuth client secret |
| `sessionSecret` | string | Yes | - | Session encryption secret |
| `allowedEmails` | string[] | No | `[]` | Allowed email addresses |
| `allowedDomains` | string[] | No | `[]` | Allowed email domains |
| `callbackUrl` | string | No | auto | OAuth callback URL |

### ValidationResult

Result of config file validation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `valid` | boolean | Yes | Whether config passed all validations |
| `errors` | ValidationError[] | Yes | List of validation errors |
| `warnings` | ValidationWarning[] | Yes | List of warnings (unknown fields, etc.) |

### ValidationError

Individual validation error.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | string | Yes | Path to invalid field (e.g., `auth.clientId`) |
| `message` | string | Yes | Human-readable error message |
| `line` | number | No | Line number in config file (if available) |
| `hint` | string | No | Suggestion for resolution |

### ValidationWarning

Non-fatal validation issue.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | string | Yes | Path to field with warning |
| `message` | string | Yes | Warning message |

### SettingDefinition

Metadata for a configurable setting (used by interactive generator).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Config key path (e.g., `auth.clientId`) |
| `type` | SettingType | Yes | Value type for validation |
| `description` | string | Yes | Human-readable description |
| `defaultValue` | unknown | No | Default value if not specified |
| `required` | boolean | No | Whether setting is required |
| `validate` | ValidatorFn | No | Custom validation function |
| `dependsOn` | string | No | Parent setting that must be enabled |

## Type Definitions

### ConfigFormat

```typescript
const CONFIG_FORMATS = {
  JSON: 'json',
  YAML: 'yaml',
} as const;

type ConfigFormat = typeof CONFIG_FORMATS[keyof typeof CONFIG_FORMATS];
```

### SettingType

```typescript
const SETTING_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING_ARRAY: 'string[]',
} as const;

type SettingType = typeof SETTING_TYPES[keyof typeof SETTING_TYPES];
```

### ValidatorFn

```typescript
type ValidatorFn = (value: unknown) => ValidationError | null;
```

## Validation Rules

### Port Validation
- Must be a number
- Range: 1-65535
- Must be an integer

### Directory Validation
- Must be a string
- Path must exist (warning if not, error at runtime)

### Watch Debounce Validation
- Must be a non-negative number
- Must be an integer

### Auth Validation
- If `authProvider` is not null:
  - `authConfig` object is required
  - `authConfig.clientId` is required
  - `authConfig.clientSecret` is required
  - `authConfig.sessionSecret` is required (or auto-generated with warning)
- If `authProvider` is null and `authConfig` is provided:
  - Warning: authConfig will be ignored
- `authConfig.allowedEmails` must be valid email format if provided
- `authConfig.allowedDomains` must be valid domain format if provided

## State Transitions

### Config Loading Flow

```
[File Path]
    → [Read File]
    → [Detect Format]
    → [Parse Content]
    → [Expand Env Vars]
    → [Validate]
    → [Merge with CLI Args]
    → [ServerConfig]
```

### Interactive Generator Flow

```
[Start]
    → [Prompt: Output Path]
    → [For Each Setting: Prompt]
    → [Build Config Object]
    → [Validate]
    → [Check Overwrite]
    → [Write File]
    → [Done]
```

## Relationships

```
ConfigFile (1) ──contains──> (1) ServerConfig
ServerConfig (1) ──optionally contains──> (1) AuthConfig
ValidationResult (1) ──contains──> (0..*) ValidationError
ValidationResult (1) ──contains──> (0..*) ValidationWarning
SettingDefinition (1) ──defines──> (1) Field in ServerConfig
```
