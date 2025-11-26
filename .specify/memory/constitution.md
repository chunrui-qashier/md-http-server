<!--
  Sync Impact Report
  ===================
  Version: 1.0.0 (initial ratification)

  Core Principles:
    - I. Zero Configuration First
    - II. Security by Default
    - III. User Experience Focus
    - IV. Simplicity Over Features

  Technical Constraints:
    - Runtime & Compatibility (Node.js 18+)
    - Performance Standards
    - Code Quality (TypeScript, FP patterns, const over enum)

  Quality Standards:
    - Testing Requirements
    - Documentation Requirements

  Governance:
    - Amendment Process
    - Versioning Policy
    - Compliance Review

  Templates Status:
    ✅ plan-template.md - Constitution Check section compatible
    ✅ spec-template.md - Requirements align with principles
    ✅ tasks-template.md - Phase structure compatible
    ✅ checklist-template.md - No changes required
    ✅ agent-file-template.md - No changes required

  Follow-up TODOs: None
-->

# md-http-server Constitution

## Core Principles

### I. Zero Configuration First

Every feature MUST work out of the box without requiring user configuration.

- Default behavior MUST be sensible and production-ready
- Configuration options MAY be provided for customization but are never required
- Features MUST auto-detect context where possible (e.g., directory structure)
- Error messages MUST guide users toward resolution without requiring documentation

**Rationale**: The project's core value proposition is instant usability. Users run
`npx md-http-server` and get a working markdown server immediately.

### II. Security by Default

Security protections MUST be built-in, not opt-in.

- Path traversal protection MUST prevent access outside served directory
- No user-provided content may execute server-side without explicit sanitization
- HTTPS upgrade SHOULD be recommended in production contexts
- Sensitive server internals MUST never leak in error responses

**Rationale**: As a file-serving utility, security vulnerabilities could expose
sensitive filesystem data. Defense-in-depth protects users who may not be
security experts.

### III. User Experience Focus

Developer experience is a first-class feature.

- Live reload MUST provide feedback within 1 second of file changes
- Rendered markdown MUST match GitHub styling for familiarity
- Error messages MUST be actionable and human-readable
- CLI output MUST be clean and informative (verbose mode available)

**Rationale**: The tool exists to improve markdown authoring workflow. Poor UX
defeats the purpose regardless of technical correctness.

### IV. Simplicity Over Features

Prefer fewer, well-implemented features over feature creep.

- New features MUST justify their complexity cost
- Dependencies MUST be minimal and well-maintained
- Code SHOULD be readable by a single developer without extensive context
- Feature requests SHOULD be evaluated against "does this help view markdown?"

**Rationale**: A simple tool that does one thing well is more valuable than a
complex tool that does many things poorly.

## Technical Constraints

### Runtime & Compatibility

- Node.js 18.0.0+ MUST be supported
- No native dependencies (pure JavaScript/TypeScript)
- Package size SHOULD remain minimal for npx cold-start performance

### Performance Standards

- Server startup MUST complete in under 2 seconds
- Markdown rendering MUST complete in under 500ms for typical files
- Live reload change detection MUST trigger within 500ms
- Memory usage SHOULD remain stable under continuous operation

### Code Quality

- TypeScript MUST be used for all new code
- Explicit types MUST be provided (avoid `any`)
- `const` objects MUST be used instead of `enum`

#### Functional Programming Patterns

Functional programming patterns MUST be used for all stateless logic.

- Pure functions MUST be preferred: same inputs always produce same outputs
- Stateless objects MUST use FP patterns (composition over inheritance)
- Data transformations MUST use immutable operations (`map`, `filter`, `reduce`)
- Side effects MUST be isolated at system boundaries (I/O, logging, network)
- Function composition SHOULD be preferred over imperative control flow
- Mutation of shared state MUST be avoided; use immutable data structures

**Rationale**: FP patterns improve testability, reduce bugs from shared mutable
state, and make data flow explicit. Stateless transformations (markdown parsing,
path validation, config merging) benefit significantly from pure functions.

## Quality Standards

### Testing Requirements

- Critical paths (markdown rendering, security) MUST have test coverage
- Security-related changes MUST include regression tests
- Breaking changes MUST be documented in CHANGELOG

### Documentation Requirements

- README MUST reflect current CLI options and features
- New features MUST be documented before merge
- API changes MUST update programmatic usage examples

## Governance

This constitution establishes non-negotiable standards for the md-http-server
project. All contributions MUST comply.

### Amendment Process

1. Propose amendment via GitHub issue or pull request
2. Justify the change with concrete use cases or problems
3. Document migration plan if amendment affects existing code
4. Update this constitution and increment version appropriately

### Versioning Policy

Constitution versions follow semantic versioning:

- **MAJOR**: Principle removal or incompatible redefinition
- **MINOR**: New principle or significant guidance expansion
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Review

- All PRs SHOULD be reviewed against applicable principles
- Constitution violations MUST be resolved before merge
- Justified exceptions MUST be documented in code comments

**Version**: 1.0.0 | **Ratified**: 2025-11-26 | **Last Amended**: 2025-11-26
