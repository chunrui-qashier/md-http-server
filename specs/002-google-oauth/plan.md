# Implementation Plan: Google OAuth Integration

**Branch**: `002-google-oauth` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-google-oauth/spec.md`

## Summary

Add optional Google OAuth authentication to md-http-server, enabling operators to protect markdown documentation behind Google login. The feature is disabled by default and activated via `--auth` CLI flag with credentials stored in a JSON config file. Sessions are stored in-memory with a logout endpoint available.

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 18+)
**Primary Dependencies**: Express 4.x (existing), google-auth-library (new), express-session (new)
**Storage**: In-memory session storage (no persistence)
**Testing**: Manual integration tests (existing project has no test framework)
**Target Platform**: Node.js server (cross-platform)
**Project Type**: Single project (CLI tool)
**Performance Goals**: Server startup <2s, OAuth redirect <500ms
**Constraints**: No native dependencies, minimal package size impact
**Scale/Scope**: Single-user to small team documentation servers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Zero Configuration First | ✅ PASS | Feature is opt-in via `--auth` flag; default behavior unchanged |
| II. Security by Default | ✅ PASS | When enabled, protects all content; credentials in config file not CLI args |
| III. User Experience Focus | ✅ PASS | Clear error messages, session persistence, logout endpoint |
| IV. Simplicity Over Features | ✅ PASS | Minimal OAuth implementation; single provider; in-memory sessions |
| TypeScript MUST be used | ✅ PASS | All new code in TypeScript |
| Explicit types (avoid `any`) | ✅ PASS | Will define AuthConfig, UserSession types |
| `const` objects over `enum` | ✅ PASS | Will use const objects for auth states |
| FP patterns for stateless logic | ✅ PASS | Config parsing, validation as pure functions |
| Dependencies minimal | ⚠️ REVIEW | Adding 2 new deps; justified for OAuth complexity |

**Complexity Justification**: Adding `google-auth-library` and `express-session` is necessary because:
- OAuth2 flow is complex; library handles token exchange, verification, refresh
- Session management requires signed cookies; express-session is well-maintained and minimal
- Alternative (manual implementation) would add ~500+ lines and security risk

## Project Structure

### Documentation (this feature)

```text
specs/002-google-oauth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── index.ts             # Library exports (add auth exports)
├── cli.ts               # CLI entry (add --auth, --auth-config flags)
├── server.ts            # Express server (add auth middleware)
├── templates.ts         # HTML templates (add error pages)
├── watcher.ts           # File watcher (unchanged)
└── auth/                # NEW: Auth module
    ├── index.ts         # Auth module exports
    ├── config.ts        # Config loading and validation (pure functions)
    ├── middleware.ts    # Express auth middleware
    ├── routes.ts        # OAuth callback, logout routes
    ├── session.ts       # Session management
    └── types.ts         # AuthConfig, UserSession types
```

**Structure Decision**: Extend existing single-project structure with new `src/auth/` module. This keeps auth logic isolated while integrating with existing Express server.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 2 new dependencies | OAuth2 flow complexity, session security | Manual implementation would be error-prone and add significant code |
