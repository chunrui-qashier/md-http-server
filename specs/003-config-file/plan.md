# Implementation Plan: Config File Support with Interactive Generator

**Branch**: `003-config-file` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-config-file/spec.md`

## Summary

Add configuration file support to md-http-server CLI, allowing users to specify all settings in a JSON or YAML file via `--config` flag instead of multiple command-line parameters. Includes an interactive `init` subcommand to guide users through config file generation and a `validate` subcommand for config validation.

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 18+)
**Primary Dependencies**: commander (existing), js-yaml (new for YAML support), inquirer (new for interactive prompts)
**Storage**: N/A (config files are user-managed)
**Testing**: Manual testing (no test framework currently in place)
**Target Platform**: Node.js CLI (cross-platform)
**Project Type**: single
**Performance Goals**: Config file parsing < 100ms, interactive prompts responsive
**Constraints**: Zero required configuration (config file is optional), maintain backward compatibility with existing CLI flags
**Scale/Scope**: Single CLI tool, ~15 configurable settings

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Zero Configuration First | PASS | Config file is optional; all existing CLI defaults remain; server works without any config |
| II. Security by Default | PASS | Config file paths validated; no code execution from config; env var expansion is read-only |
| III. User Experience Focus | PASS | Interactive generator provides guided setup; clear error messages with line numbers |
| IV. Simplicity Over Features | PASS | Feature directly supports core use case (easier server configuration); minimal new dependencies |
| TypeScript required | PASS | All new code in TypeScript |
| FP patterns for stateless logic | PASS | Config parsing, validation, merging are pure functions |
| const over enum | PASS | Use const objects for config keys and formats |

**Gate Result**: PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/003-config-file/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI contract)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── index.ts         # Config module exports
│   ├── types.ts         # Config type definitions
│   ├── loader.ts        # Config file loading (JSON/YAML)
│   ├── validator.ts     # Config validation logic
│   ├── merger.ts        # CLI args + config file merging
│   └── env.ts           # Environment variable expansion
├── commands/
│   ├── init.ts          # Interactive config generator
│   └── validate.ts      # Config validation command
├── cli.ts               # Updated with --config flag and subcommands
├── server.ts            # Unchanged
└── ... (existing files)

tests/
└── (no test framework currently)
```

**Structure Decision**: Single project structure maintained. New `config/` module added for config-related logic. New `commands/` directory for subcommand implementations. Follows existing patterns in codebase.

## Complexity Tracking

> No violations to justify - all gates passed.
