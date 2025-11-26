# Feature Specification: Google OAuth Integration

**Feature Branch**: `002-google-oauth`
**Created**: 2025-11-26
**Status**: Draft
**Input**: User description: "add google oauth integration. add cli parameter to enable this feature. use config file for credentials. Default is off."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enable OAuth Protection via CLI (Priority: P1)

A server operator wants to protect their markdown documentation with Google OAuth so that only authorized users can view the content. They enable the feature via a command-line flag and provide credentials through a configuration file.

**Why this priority**: This is the core enabling mechanism. Without the ability to turn on OAuth protection via CLI, no other OAuth functionality is accessible.

**Independent Test**: Run the server with `--auth` flag and a valid config file, then verify that accessing any markdown file redirects to Google login.

**Acceptance Scenarios**:

1. **Given** a valid OAuth config file exists, **When** the operator starts the server with `--auth` flag, **Then** the server starts successfully and requires authentication for all content.
2. **Given** the `--auth` flag is not provided, **When** the operator starts the server, **Then** all content remains publicly accessible (default behavior unchanged).
3. **Given** the `--auth` flag is provided but config file is missing or invalid, **When** the operator starts the server, **Then** the server exits with a clear error message explaining the configuration issue.

---

### User Story 2 - Authenticate via Google (Priority: P2)

A user attempts to access protected markdown content and is redirected to authenticate with their Google account. After successful authentication, they gain access to the documentation.

**Why this priority**: Once OAuth is enabled, users need a seamless authentication experience to access content.

**Independent Test**: Access a protected page, complete Google login, and verify the markdown content is displayed.

**Acceptance Scenarios**:

1. **Given** OAuth protection is enabled, **When** an unauthenticated user accesses any markdown file, **Then** they are redirected to Google's authentication page.
2. **Given** a user completes Google authentication successfully, **When** they are redirected back to the server, **Then** they can view the originally requested content.
3. **Given** a user denies authentication or an error occurs, **When** they are redirected back, **Then** they see a friendly error message explaining they cannot access the content.

---

### User Story 3 - Maintain Session After Authentication (Priority: P3)

An authenticated user navigates between multiple markdown files without needing to re-authenticate for each page during their session.

**Why this priority**: Without session persistence, users would need to authenticate for every page load, creating a frustrating experience.

**Independent Test**: Authenticate once, then navigate to multiple different markdown files and verify no re-authentication is required.

**Acceptance Scenarios**:

1. **Given** a user has authenticated successfully, **When** they navigate to other protected pages, **Then** they access content without re-authenticating.
2. **Given** a user's session expires or they clear cookies, **When** they access a protected page, **Then** they are prompted to authenticate again.

---

### Edge Cases

- User attempts to access the server with `--auth` but the config file path is incorrect or permissions prevent reading it.
- Google OAuth service is temporarily unavailable during authentication attempt.
- User's Google account is valid but their email domain is not in an allowed list (if domain restriction is configured).
- Multiple users authenticate simultaneously from different browsers.
- User bookmarks a protected page and returns after session expiration.
- Config file contains malformed credentials (invalid JSON, missing required fields).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `--auth` CLI flag to enable OAuth protection (disabled by default).
- **FR-002**: System MUST read OAuth credentials from a configuration file when `--auth` is enabled.
- **FR-003**: System MUST accept a `--auth-config <path>` CLI option to specify a custom config file location (default: `.md-server-auth.json` in the served directory).
- **FR-004**: System MUST redirect unauthenticated users to Google OAuth when accessing any content in the served directory (markdown files and static assets).
- **FR-005**: System MUST establish a session for authenticated users to prevent repeated authentication.
- **FR-006**: System MUST validate the configuration file on startup and provide clear error messages if invalid.
- **FR-007**: System MUST support restricting access to specific email domains via configuration (optional field).
- **FR-008**: System MUST display user-friendly error pages for authentication failures.
- **FR-009**: System MUST log authentication events (login success, login failure, session expiration) when verbose mode is enabled.
- **FR-010**: System MUST preserve the original requested URL and redirect users there after successful authentication.
- **FR-011**: System MUST provide a logout endpoint (e.g., `/__logout`) that clears the user's session and redirects to a confirmation page.

### Key Entities

- **AuthConfig**: Configuration for OAuth including client ID, client secret, callback URL, allowed email domains (optional), and session settings.
- **UserSession**: Represents an authenticated user's session including their email, display name, and session expiration time.

## Clarifications

### Session 2025-11-26

- Q: Session storage strategy (in-memory vs persistent)? → A: In-memory only (sessions lost on restart)
- Q: Should users have explicit logout capability? → A: Yes, provide logout endpoint (e.g., `/__logout`)
- Q: Should static assets (images, CSS, JS) also require authentication? → A: Yes, protect all content in served directory

## Assumptions

- The operator already has Google OAuth credentials (client ID and client secret) from the Google Cloud Console.
- The server is accessible via a publicly reachable URL or localhost for OAuth callback handling.
- Session data is stored in-memory; server restart clears all sessions (acceptable for a development/preview tool).
- Standard session duration of 24 hours is appropriate for most use cases.
- Only Google OAuth is supported initially; other providers may be added in future iterations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operators can enable OAuth protection by adding a single CLI flag and config file, with setup completed in under 5 minutes.
- **SC-002**: 100% of unauthenticated requests to protected content result in redirect to Google authentication.
- **SC-003**: Authenticated users can navigate between 10+ pages without re-authenticating during a single session.
- **SC-004**: Server startup with invalid configuration fails within 2 seconds with an actionable error message.
- **SC-005**: Existing users who do not use `--auth` flag experience zero changes in behavior (backward compatibility).
