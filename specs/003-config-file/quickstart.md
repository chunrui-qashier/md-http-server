# Quickstart: Config File Support

**Feature**: 003-config-file
**Date**: 2025-11-28

## Overview

This feature adds configuration file support to md-http-server, allowing you to store all server settings in a JSON or YAML file instead of passing multiple command-line arguments.

## Quick Examples

### Create a Config File (Interactive)

```bash
md-http-server init
```

Answer the prompts to create `md-server.config.json`.

### Create a Config File (Manual)

Create `md-server.config.json`:

```json
{
  "directory": "./docs",
  "port": 8080,
  "watch": true
}
```

### Use the Config File

```bash
md-http-server --config ./md-server.config.json
```

### Override Config with CLI

```bash
md-http-server --config ./config.json --port 3000
```

## File Formats

### JSON

```json
{
  "directory": "./docs",
  "port": 3000,
  "verbose": false,
  "watch": true,
  "watchDebounce": 500
}
```

### YAML

```yaml
directory: ./docs
port: 3000
verbose: false
watch: true
watchDebounce: 500
```

## Environment Variables

Use `${VAR_NAME}` syntax for secrets:

```json
{
  "authProvider": "GOOGLE",
  "authConfig": {
    "clientId": "${GOOGLE_CLIENT_ID}",
    "clientSecret": "${GOOGLE_CLIENT_SECRET}"
  }
}
```

With defaults:

```yaml
authConfig:
  sessionSecret: ${SESSION_SECRET:-dev-secret-change-me}
```

## Common Configurations

### Development Server

```json
{
  "directory": ".",
  "port": 3000,
  "verbose": true,
  "watch": true
}
```

### Production with Google OAuth

```yaml
directory: ./public
port: 8080
watch: false

authProvider: GOOGLE
authConfig:
  clientId: ${GOOGLE_CLIENT_ID}
  clientSecret: ${GOOGLE_CLIENT_SECRET}
  sessionSecret: ${SESSION_SECRET}
  allowedDomains:
    - mycompany.com
```

### No Authentication (Default)

```json
{
  "directory": "./docs",
  "port": 3000,
  "watch": true
}
```

When `authProvider` is omitted or `null`, no authentication is required.

## Validate Config

```bash
md-http-server validate --config ./config.json
```

## Priority Order

Settings are applied in this order (highest priority last):

1. Built-in defaults
2. Config file values
3. CLI arguments

## Full Options Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `directory` | string | `.` | Directory to serve |
| `port` | number | `3000` | Server port |
| `verbose` | boolean | `false` | Enable logging |
| `watch` | boolean | `false` | Live reload |
| `watchDebounce` | number | `500` | Debounce (ms) |
| `authProvider` | string/null | `null` | OAuth provider (`"GOOGLE"` or `null`) |
| `authConfig.clientId` | string | - | OAuth Client ID |
| `authConfig.clientSecret` | string | - | OAuth Client Secret |
| `authConfig.sessionSecret` | string | - | Session secret |
| `authConfig.allowedEmails` | string[] | `[]` | Allowed emails |
| `authConfig.allowedDomains` | string[] | `[]` | Allowed domains |
