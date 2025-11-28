# Research: Config File Support

**Feature**: 003-config-file
**Date**: 2025-11-28

## Research Tasks

### 1. YAML Parsing Library Selection

**Decision**: Use `js-yaml` for YAML parsing

**Rationale**:
- Most popular YAML parser for Node.js (40M+ weekly downloads)
- Pure JavaScript, no native dependencies (aligns with constitution)
- Supports YAML 1.1 and 1.2 specifications
- Provides line number information for error reporting
- Well-maintained and security-conscious (`safeLoad` by default)

**Alternatives Considered**:
- `yaml`: Newer, YAML 1.2 compliant, but less battle-tested
- `yamljs`: Smaller but less maintained, missing error location info

### 2. Interactive CLI Library Selection

**Decision**: Use `@inquirer/prompts` for interactive prompts

**Rationale**:
- Modern ESM-first package from the Inquirer.js ecosystem
- Supports TypeScript natively
- Individual prompt imports reduce bundle size
- Promise-based API fits existing async patterns
- Built-in validation support

**Alternatives Considered**:
- `inquirer` (classic): Larger bundle, CJS-focused
- `prompts`: Lighter but less feature-rich validation
- `enquirer`: Good alternative but smaller community

### 3. Config File Format Best Practices

**Decision**: Support both JSON and YAML with consistent schema

**Rationale**:
- JSON: Native to Node.js, no dependencies for parsing, strict syntax
- YAML: Human-friendly, supports comments, widely used for config files
- Detection via file extension (`.json`, `.yml`, `.yaml`)
- Same validation schema for both formats

**Best Practices Applied**:
- Config schema mirrors CLI options for predictability
- Nested structure for related settings (e.g., `auth.clientId`)
- Clear separation between server config and auth config
- Environment variable expansion for secrets

### 4. CLI Argument Override Pattern

**Decision**: CLI arguments take precedence over config file values

**Rationale**:
- 12-factor app principle: environment/CLI should override files
- Allows temporary overrides without editing config
- Standard pattern in tools like webpack, eslint, prettier

**Merge Order** (lowest to highest priority):
1. Built-in defaults
2. Config file values
3. CLI arguments

### 5. Environment Variable Expansion

**Decision**: Support `${VAR_NAME}` syntax with optional default `${VAR_NAME:-default}`

**Rationale**:
- Matches shell syntax for familiarity
- Supports optional defaults for robustness
- Only expands in string values (not keys or structure)
- Expansion happens at load time, not runtime

**Implementation**:
- Pure function: `expandEnvVars(value: string): string`
- Regex pattern: `/\$\{([^}:]+)(?::-([^}]*))?\}/g`
- Undefined variables without defaults produce warning

### 6. Error Message Best Practices

**Decision**: Include file path, line number (when available), and resolution hint

**Rationale**:
- Constitution requires actionable error messages
- YAML parser provides line/column on syntax errors
- JSON parser provides position offset (convertible to line)

**Error Format**:
```
Config error in /path/to/config.json:15
  Invalid value for 'port': expected number, got string
  Hint: Use a number like 3000, not "3000"
```

### 7. Existing CLI Options Analysis

**Current CLI Options** (from `src/cli.ts`):

| Option | Type | Default | Config Key |
|--------|------|---------|------------|
| `[directory]` | string | `.` | `directory` |
| `-p, --port` | number | `3000` | `port` |
| `-v, --verbose` | boolean | `false` | `verbose` |
| `-w, --watch` | boolean | `false` | `watch` |
| `--watch-debounce` | number | `500` | `watchDebounce` |
| `--auth` | boolean | `false` | `auth.enabled` |
| `--auth-config` | string | `.md-server-auth.json` | `auth.configPath` |

**New Options**:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `-c, --config` | string | none | Path to config file |

**New Subcommands**:

| Command | Purpose |
|---------|---------|
| `init` | Interactive config generator |
| `validate` | Validate config file |

### 8. Commander.js Subcommand Pattern

**Decision**: Use commander's `.command()` for subcommands

**Pattern**:
```typescript
program
  .command('init')
  .description('Create a config file interactively')
  .option('-o, --output <path>', 'Output file path', 'md-server.config.json')
  .action(initCommand);

program
  .command('validate')
  .description('Validate a config file')
  .requiredOption('-c, --config <path>', 'Config file to validate')
  .action(validateCommand);
```

**Note**: Default command (serve) runs when no subcommand specified.

## Dependency Summary

| Package | Version | Purpose | Size Impact |
|---------|---------|---------|-------------|
| `js-yaml` | ^4.1.0 | YAML parsing | ~60KB |
| `@inquirer/prompts` | ^7.0.0 | Interactive CLI | ~50KB |

**Total Addition**: ~110KB (acceptable for CLI tool)

## Resolved Clarifications

All technical decisions made based on:
- Existing codebase patterns (TypeScript, Express, commander)
- Constitution principles (zero-config, security, UX, simplicity)
- Industry best practices for CLI tools
