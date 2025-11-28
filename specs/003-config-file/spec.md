# Feature Specification: Config File Support with Interactive Generator

**Feature Branch**: `003-config-file`
**Created**: 2025-11-28
**Status**: Draft
**Input**: User description: "Add a config file feature. All settings can be configured in config file. Then we just pass a config file to cli instead of multiple parameters. And add a new interactive cli command to help user generate the config file"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run CLI with Config File (Priority: P1)

As a user, I want to run the md-server CLI by passing a single config file path instead of multiple command-line parameters, so that I can simplify my workflow and reuse configurations.

**Why this priority**: This is the core functionality that enables all other config-related features. Without the ability to read a config file, the interactive generator has no purpose.

**Independent Test**: Can be fully tested by creating a config file manually, running the CLI with `--config` flag, and verifying the server starts with the correct settings.

**Acceptance Scenarios**:

1. **Given** a valid config file exists at a known path, **When** the user runs `md-server --config ./config.json`, **Then** the server starts using all settings from the config file
2. **Given** the config file contains all required settings, **When** the server starts, **Then** no additional command-line parameters are needed
3. **Given** the config file path does not exist, **When** the user runs `md-server --config ./missing.json`, **Then** a clear error message indicates the file was not found
4. **Given** both config file and command-line parameters are provided, **When** the user runs `md-server --config ./config.json --port 8080`, **Then** command-line parameters override config file values

---

### User Story 2 - Interactive Config File Generator (Priority: P2)

As a user, I want an interactive CLI command that guides me through creating a config file by prompting for each setting, so that I don't need to manually write the config file or remember all available options.

**Why this priority**: This improves user experience significantly but requires the config file reading capability (P1) to be useful. Users can manually create config files without this feature.

**Independent Test**: Can be fully tested by running the interactive command, answering prompts, and verifying a valid config file is created at the specified location.

**Acceptance Scenarios**:

1. **Given** the user runs `md-server init`, **When** the interactive session starts, **Then** the user is prompted for each configurable setting with helpful descriptions
2. **Given** the user is in the interactive session, **When** a setting has a default value, **Then** the default is clearly displayed and pressing Enter accepts it
3. **Given** the user has answered all prompts, **When** the session completes, **Then** a config file is created at the specified output location
4. **Given** the output file already exists, **When** the user completes the interactive session, **Then** they are prompted to confirm overwriting the existing file
5. **Given** the user provides an invalid value for a setting, **When** validation fails, **Then** a clear error message is shown and the user can re-enter the value

---

### User Story 3 - Config File Validation (Priority: P3)

As a user, I want the CLI to validate my config file and report any errors clearly, so that I can fix configuration issues before starting the server.

**Why this priority**: This is an enhancement that improves reliability but the basic functionality can work without explicit validation command.

**Independent Test**: Can be fully tested by creating config files with various errors and running validation command to verify appropriate error messages.

**Acceptance Scenarios**:

1. **Given** a config file with an invalid setting value, **When** the user runs `md-server validate --config ./config.json`, **Then** a clear error message identifies the invalid setting and expected format
2. **Given** a config file with missing required settings, **When** validation runs, **Then** all missing required settings are listed
3. **Given** a valid config file, **When** validation runs, **Then** a success message confirms the config is valid

---

### Edge Cases

- What happens when the config file contains unknown/unsupported settings? → Unknown settings are ignored with a warning message
- What happens when the config file has syntax errors (malformed JSON/YAML)? → Clear parsing error with line number if possible
- How does system handle empty config file? → Treat as valid but use all defaults, with informational message
- What happens when user cancels interactive session midway (Ctrl+C)? → No file is created, exit gracefully without partial file
- How does system handle config file with environment variable references? → Environment variables in format `${VAR_NAME}` are expanded at runtime

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a `--config` or `-c` flag that takes a path to a configuration file
- **FR-002**: System MUST support JSON format for configuration files
- **FR-003**: System MUST support YAML format for configuration files (detected by `.yml` or `.yaml` extension)
- **FR-004**: System MUST allow command-line parameters to override config file values when both are provided
- **FR-005**: System MUST provide an `init` subcommand that launches an interactive config file generator
- **FR-006**: System MUST display helpful descriptions for each setting during interactive generation
- **FR-007**: System MUST show default values during interactive prompts and allow accepting defaults by pressing Enter
- **FR-008**: System MUST validate user input during interactive session and allow re-entry on invalid values
- **FR-009**: System MUST prompt for confirmation before overwriting existing config files
- **FR-010**: System MUST provide a `validate` subcommand to check config file validity
- **FR-011**: System MUST report all validation errors at once rather than stopping at first error
- **FR-012**: System MUST support environment variable expansion in config values using `${VAR_NAME}` syntax
- **FR-013**: System MUST warn about unknown/unrecognized settings in config file without failing
- **FR-014**: System MUST provide clear error messages including file path and line numbers when parsing fails
- **FR-015**: System MUST allow specifying output file path during interactive generation (default: `./md-server.config.json`)

### Key Entities

- **ConfigFile**: Represents a configuration file containing all server settings. Attributes include: file path, format (JSON/YAML), settings map, validation state
- **Setting**: Individual configuration option with: key name, value, default value, description, validation rules, required flag
- **ValidationResult**: Outcome of config validation containing: valid/invalid status, list of errors, list of warnings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can start the server with a config file in under 5 seconds using a single command
- **SC-002**: Users can complete the interactive config generation in under 2 minutes for all settings
- **SC-003**: 95% of configuration errors produce actionable error messages that lead to resolution
- **SC-004**: Config file validation completes in under 1 second for files under 10KB
- **SC-005**: All existing CLI parameters can be specified in the config file with equivalent behavior

## Assumptions

- JSON and YAML are the most common configuration file formats for Node.js CLI tools; both are supported
- Users prefer interactive setup for first-time configuration but may manually edit files afterward
- Default output filename `md-server.config.json` follows common CLI tool conventions
- Command-line parameters taking precedence over config file values is expected behavior (12-factor app principles)
- Environment variable expansion is a common need for secrets and environment-specific values
