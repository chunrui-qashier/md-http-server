# CLI Contract: Config File Support

**Feature**: 003-config-file
**Date**: 2025-11-28

## Command Overview

```
md-http-server [options] [directory]     # Serve directory (default command)
md-http-server init [options]            # Interactive config generator
md-http-server validate [options]        # Validate config file
```

## Default Command: Serve

### Synopsis

```
md-http-server [directory] [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--config <path>` | `-c` | string | - | Path to config file |
| `--port <port>` | `-p` | number | `3000` | Server port |
| `--verbose` | `-v` | boolean | `false` | Verbose logging |
| `--watch` | `-w` | boolean | `false` | Enable live reload |
| `--watch-debounce <ms>` | - | number | `500` | File change debounce |
| `--auth-provider <provider>` | - | string | - | OAuth provider (`GOOGLE` or omit to disable) |
| `--help` | `-h` | - | - | Show help |
| `--version` | `-V` | - | - | Show version |

### Behavior

1. If `--config` provided:
   - Load and validate config file
   - Expand environment variables
   - Merge with CLI arguments (CLI takes precedence)
2. Start server with resolved configuration

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Server started successfully |
| 1 | Configuration error (invalid file, missing required fields) |
| 1 | Runtime error (port in use, directory not found) |

### Examples

```bash
# Use config file
md-http-server --config ./md-server.config.json

# Config file with CLI override
md-http-server --config ./config.json --port 8080

# Config file shorthand
md-http-server -c config.yaml ./docs
```

---

## Subcommand: init

### Synopsis

```
md-http-server init [options]
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--output <path>` | `-o` | string | `md-server.config.json` | Output file path |
| `--format <fmt>` | `-f` | string | auto | Output format (json/yaml) |
| `--yes` | `-y` | boolean | `false` | Accept all defaults |
| `--help` | `-h` | - | - | Show help |

### Interactive Prompts

When run without `--yes`, prompts for each setting:

```
? Directory to serve (.)
? Server port (3000)
? Enable verbose logging? (No)
? Enable live reload? (No)
? Watch debounce in ms (500)
? Authentication provider (None / GOOGLE)
[If GOOGLE selected:]
? Google OAuth Client ID
? Google OAuth Client Secret
? Session Secret
? Allowed email addresses (comma-separated)
? Allowed domains (comma-separated)
? Output file path (md-server.config.json)
? File exists. Overwrite? (Yes/No)
```

### Behavior

1. Prompt for each configurable setting
2. Show default values and allow Enter to accept
3. Validate input inline, re-prompt on error
4. Detect output format from extension (`.yaml`/`.yml` → YAML, else JSON)
5. Check if file exists, prompt for overwrite confirmation
6. Write formatted config file

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Config file created successfully |
| 0 | User cancelled (Ctrl+C) |
| 1 | Write error (permissions, disk full) |

### Examples

```bash
# Interactive creation
md-http-server init

# Create YAML config
md-http-server init --output config.yaml

# Create with all defaults (non-interactive)
md-http-server init --yes

# Create with specific output path
md-http-server init -o ~/.config/md-server/config.json
```

---

## Subcommand: validate

### Synopsis

```
md-http-server validate --config <path>
```

### Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--config <path>` | `-c` | string | **required** | Config file to validate |
| `--quiet` | `-q` | boolean | `false` | Only show errors |
| `--help` | `-h` | - | - | Show help |

### Output Format

**Valid config:**
```
✓ Config file is valid: /path/to/config.json
  7 settings configured
```

**Invalid config:**
```
✗ Config file has errors: /path/to/config.json

Errors:
  - port: Invalid value "abc", expected number (line 3)
    Hint: Use a number between 1 and 65535

  - authConfig.clientId: Required when authProvider is set (line 8)
    Hint: Set authConfig.clientId or remove authProvider

Warnings:
  - unknownField: Unrecognized setting, will be ignored (line 12)
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Config is valid |
| 1 | Config has errors |

### Examples

```bash
# Validate config
md-http-server validate --config ./config.json

# Quiet mode (CI/CD)
md-http-server validate -c config.yaml -q
```

---

## Config File Schema

### JSON Example

```json
{
  "directory": "./docs",
  "port": 3000,
  "verbose": false,
  "watch": true,
  "watchDebounce": 500,
  "authProvider": "GOOGLE",
  "authConfig": {
    "clientId": "${GOOGLE_CLIENT_ID}",
    "clientSecret": "${GOOGLE_CLIENT_SECRET}",
    "sessionSecret": "${SESSION_SECRET}",
    "allowedDomains": ["example.com"],
    "allowedEmails": ["admin@example.com"]
  }
}
```

### YAML Example

```yaml
# md-server configuration
directory: ./docs
port: 3000
verbose: false
watch: true
watchDebounce: 500

authProvider: GOOGLE
authConfig:
  clientId: ${GOOGLE_CLIENT_ID}
  clientSecret: ${GOOGLE_CLIENT_SECRET}
  sessionSecret: ${SESSION_SECRET}
  allowedDomains:
    - example.com
  allowedEmails:
    - admin@example.com
```

### No Authentication Example

```json
{
  "directory": "./docs",
  "port": 3000,
  "watch": true
}
```

Note: When `authProvider` is omitted or `null`, authentication is disabled and `authConfig` is not required.

### Environment Variable Expansion

- Syntax: `${VAR_NAME}` or `${VAR_NAME:-default}`
- Only in string values
- Expanded at config load time
- Undefined vars without defaults produce warning

---

## Error Messages

### File Not Found

```
Error: Config file not found: /path/to/missing.json
Hint: Check the file path or run 'md-http-server init' to create one
```

### Parse Error (JSON)

```
Error: Failed to parse config file: /path/to/config.json
  Unexpected token at position 156 (line 8, column 12)
Hint: Validate your JSON syntax at jsonlint.com
```

### Parse Error (YAML)

```
Error: Failed to parse config file: /path/to/config.yaml
  bad indentation of a mapping entry at line 5, column 3
Hint: Check indentation uses consistent spaces (not tabs)
```

### Validation Error

```
Error: Invalid configuration in /path/to/config.json

  - port: Value 70000 exceeds maximum 65535
    Hint: Use a port between 1 and 65535

  - authConfig.clientSecret: Required when authProvider is set
    Hint: Add authConfig.clientSecret or remove authProvider
```

### Undefined Environment Variable

```
Warning: Environment variable GOOGLE_CLIENT_ID is not defined
  Used in: authConfig.clientId
  Hint: Set the variable or provide a default: ${GOOGLE_CLIENT_ID:-default}
```
