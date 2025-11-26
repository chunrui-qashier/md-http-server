# Tasks: Google OAuth Integration

**Input**: Design documents from `/specs/002-google-oauth/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in spec - omitting test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- Auth module: `src/auth/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Install google-auth-library dependency via `npm install google-auth-library`
- [x] T002 Install express-session and types via `npm install express-session @types/express-session`
- [x] T003 Create auth module directory structure at src/auth/

**Checkpoint**: Dependencies installed, directory structure ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create AuthConfig type and AUTH_ERROR_CODES const in src/auth/types.ts
- [x] T005 [P] Create UserSession type in src/auth/types.ts
- [x] T006 [P] Create OAuthState type in src/auth/types.ts
- [x] T007 [P] Create AuthError type in src/auth/types.ts
- [x] T008 Create config loader function (loadAuthConfig) in src/auth/config.ts
- [x] T009 Create config validator function (validateAuthConfig) in src/auth/config.ts
- [x] T010 Create auth module exports barrel in src/auth/index.ts

**Checkpoint**: Foundation ready - all types defined, config loading works

---

## Phase 3: User Story 1 - Enable OAuth Protection via CLI (Priority: P1) 🎯 MVP

**Goal**: Server operator can enable OAuth protection with `--auth` flag and config file

**Independent Test**: Run `npx md-http-server --auth ./docs` with valid config, verify server starts and requires auth

### Implementation for User Story 1

- [x] T011 [US1] Add --auth and --auth-config CLI options in src/cli.ts
- [x] T012 [US1] Add config validation on startup when --auth is provided in src/cli.ts
- [x] T013 [US1] Create session middleware setup function in src/auth/session.ts
- [x] T014 [US1] Create auth middleware (requireAuth) that blocks unauthenticated requests in src/auth/middleware.ts
- [x] T015 [US1] Integrate session middleware into Express app in src/server.ts
- [x] T016 [US1] Integrate auth middleware into Express app in src/server.ts
- [x] T017 [US1] Add startup logging for auth enabled state in src/cli.ts
- [x] T018 [US1] Handle config validation errors with clear exit messages in src/cli.ts

**Checkpoint**: Server with `--auth` flag blocks all requests until authenticated

---

## Phase 4: User Story 2 - Authenticate via Google (Priority: P2)

**Goal**: Users can authenticate via Google OAuth and access protected content

**Independent Test**: Access protected page, complete Google login, verify content displays

### Implementation for User Story 2

- [x] T019 [US2] Create PKCE helper functions (generateCodeVerifier, generateCodeChallenge) in src/auth/pkce.ts
- [x] T020 [US2] Create state token generator function in src/auth/state.ts
- [x] T021 [US2] Implement /__auth/login route handler in src/auth/routes.ts
- [x] T022 [US2] Implement /__auth/callback route handler in src/auth/routes.ts
- [x] T023 [US2] Implement /__auth/error route handler in src/auth/routes.ts
- [x] T024 [US2] Create error page HTML template in src/templates.ts
- [x] T025 [US2] Create domain validation function (isAllowedDomain) in src/auth/config.ts
- [x] T026 [US2] Register auth routes in Express app in src/server.ts
- [x] T027 [US2] Update auth middleware to redirect to /__auth/login in src/auth/middleware.ts
- [x] T028 [US2] Implement return URL preservation (store in session, redirect after auth) in src/auth/routes.ts

**Checkpoint**: Full OAuth flow works - users can log in via Google

---

## Phase 5: User Story 3 - Maintain Session After Authentication (Priority: P3)

**Goal**: Authenticated users browse multiple pages without re-authenticating

**Independent Test**: Log in once, navigate 10+ pages, verify no re-auth prompts

### Implementation for User Story 3

- [x] T029 [US3] Implement session expiration check in auth middleware in src/auth/middleware.ts
- [x] T030 [US3] Implement /__logout route handler in src/auth/routes.ts
- [x] T031 [US3] Create logout confirmation page HTML template in src/templates.ts
- [x] T032 [US3] Add session logging (login, logout, expiry) for verbose mode in src/auth/middleware.ts
- [x] T033 [US3] Update middleware to bypass auth for /__auth/* and /__logout routes in src/auth/middleware.ts
- [x] T034 [US3] Ensure /__sse (live reload) route bypasses auth in src/auth/middleware.ts

**Checkpoint**: Sessions persist across page loads, logout works

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and final validation

- [x] T035 [P] Update README.md with --auth and --auth-config documentation
- [x] T036 [P] Add .md-server-auth.json to .gitignore example in README.md
- [x] T037 Export auth types from src/index.ts for programmatic usage
- [x] T038 Add auth options to createServer() function signature in src/index.ts
- [x] T039 Run quickstart.md validation (manual test of setup flow)
- [x] T040 Verify backward compatibility: server without --auth works unchanged

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P2) → US3 (P3) in priority order
  - US2 depends on US1 (needs middleware infrastructure)
  - US3 depends on US2 (needs session infrastructure from OAuth flow)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Requires US1 middleware to be in place
- **User Story 3 (P3)**: Requires US2 session creation to be working

### Within Each User Story

- Types/utilities before middleware
- Middleware before routes
- Routes before integration
- Integration before logging/polish

### Parallel Opportunities

- All Foundational type tasks (T004-T007) can run in parallel
- Polish documentation tasks (T035-T036) can run in parallel
- Within US2: PKCE helpers (T019) and state generator (T020) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all type definitions together:
Task: "Create AuthConfig type and AUTH_ERROR_CODES const in src/auth/types.ts"
Task: "Create UserSession type in src/auth/types.ts"
Task: "Create OAuthState type in src/auth/types.ts"
Task: "Create AuthError type in src/auth/types.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 (T011-T018)
4. **STOP and VALIDATE**: Server blocks requests when --auth enabled
5. Can demo: "Server requires authentication"

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Auth protection enabled (MVP!)
3. Add User Story 2 → Full OAuth flow works
4. Add User Story 3 → Sessions and logout work
5. Polish → Documentation complete

### Single Developer Strategy

Execute phases sequentially:
1. Phase 1 (Setup): ~10 min
2. Phase 2 (Foundational): ~30 min
3. Phase 3 (US1 - MVP): ~1 hour
4. Phase 4 (US2): ~2 hours
5. Phase 5 (US3): ~1 hour
6. Phase 6 (Polish): ~30 min

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All new code in TypeScript with explicit types
- Use FP patterns: pure functions for config validation, PKCE generation
- Use const objects for AUTH_ERROR_CODES (not enum)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
