# Interactive Config Generator Flow

**Feature**: 003-config-file
**Date**: 2025-11-28

## Flow Diagram

```mermaid
flowchart TD
    subgraph START[" "]
        A[("md-http-server init")]
    end

    A --> B["Show welcome banner"]

    subgraph BASIC["Basic Settings"]
        B --> C["? Directory to serve (.)"]
        C --> D["? Server port (3000)"]
    end

    subgraph DX["Developer Experience"]
        D --> E{"? Enable live reload?"}
        E -->|Yes| F["? Watch debounce in ms (500)"]
        E -->|No| G["? Enable verbose logging?"]
        F --> G
    end

    subgraph AUTH["Authentication"]
        G --> H{"? Protect with authentication?"}

        H -->|"No, keep it open"| OUTPUT
        H -->|"Yes, Google OAuth"| I["? Client ID"]

        I --> J["? Client Secret (hidden)"]
        J --> K{"? Session Secret"}

        K -->|Auto-generate| L
        K -->|Enter custom| K1["? Enter session secret"]
        K1 --> L

        L{"? Who should have access?"}

        L -->|"Anyone with Google"| OUTPUT
        L -->|"Only specific emails"| M["? Allowed emails"]
        L -->|"Only specific domains"| N["? Allowed domains"]
        L -->|"Both emails and domains"| O["? Allowed emails"]

        M --> OUTPUT
        N --> OUTPUT
        O --> P["? Allowed domains"]
        P --> OUTPUT
    end

    subgraph OUTPUT["Output"]
        Q["? Output file path"]
        Q --> R{"File exists?"}

        R -->|No| T
        R -->|Yes| S{"? Overwrite?"}

        S -->|"Yes, replace"| T
        S -->|"No, new name"| U["? New filename"]
        U --> T

        T["Detect format from extension"]
        T --> V["Write config file"]
    end

    subgraph DONE["Summary"]
        V --> W["✓ Configuration saved"]
        W --> X["Show: md-http-server -c filename"]
        X --> Y(("END"))
    end

    style A fill:#4CAF50,color:#fff
    style Y fill:#4CAF50,color:#fff
    style H fill:#FF9800,color:#fff
    style E fill:#FF9800,color:#fff
    style L fill:#FF9800,color:#fff
    style R fill:#FF9800,color:#fff
    style S fill:#FF9800,color:#fff
    style K fill:#FF9800,color:#fff
```

## Simplified View

```mermaid
flowchart LR
    subgraph Flow["Config Generator Flow"]
        direction TB

        Basic["📁 Basic\n(Directory, Port)"]
        LiveReload{"🔄 Live\nReload?"}
        Debounce["⏱️ Debounce"]
        Verbose["📝 Verbose"]
        Auth{"🔐 Auth?"}
        AuthConfig["🔑 OAuth Config\n(ID, Secret, Session)"]
        Access{"👥 Access\nControl?"}
        Emails["📧 Emails"]
        Domains["🌐 Domains"]
        Output["💾 Output File"]
        Done["✅ Done"]

        Basic --> LiveReload
        LiveReload -->|Yes| Debounce --> Verbose
        LiveReload -->|No| Verbose
        Verbose --> Auth
        Auth -->|No| Output
        Auth -->|Google| AuthConfig --> Access
        Access -->|Anyone| Output
        Access -->|Emails| Emails --> Output
        Access -->|Domains| Domains --> Output
        Access -->|Both| Emails --> Domains
        Domains --> Output
        Output --> Done
    end
```

## Conditional Paths

```mermaid
flowchart TD
    subgraph Legend["Conditional Logic"]
        direction LR
        Always["Always shown"]
        Conditional["Conditionally shown"]
        style Always fill:#4CAF50,color:#fff
        style Conditional fill:#FF9800,color:#fff
    end
```

| Decision Point | Condition | Result |
|----------------|-----------|--------|
| Live reload? | No | Skip debounce prompt |
| Live reload? | Yes | Show debounce prompt |
| Auth? | No | Skip all auth config |
| Auth? | Google | Show OAuth config flow |
| Session secret? | Auto-generate | Skip manual entry |
| Session secret? | Custom | Show manual entry |
| Access? | Anyone | Skip emails/domains |
| Access? | Emails only | Show emails prompt |
| Access? | Domains only | Show domains prompt |
| Access? | Both | Show emails + domains |
| File exists? | No | Skip overwrite prompt |
| File exists? | Yes | Show overwrite prompt |
| Overwrite? | No | Show new filename prompt |

## Prompt Count by Path

```mermaid
pie title Prompts by Use Case
    "Minimal (5)" : 5
    "Dev Mode (6)" : 6
    "Auth + Anyone (9)" : 9
    "Auth + Domains (10)" : 10
    "Full Auth (11)" : 11
```

## Prompt Details

### Basic Settings

| Prompt | Type | Default | Validation |
|--------|------|---------|------------|
| Directory | text | `.` | Must be valid path |
| Port | number | `3000` | 1-65535 |

### Developer Experience

| Prompt | Type | Default | Condition |
|--------|------|---------|-----------|
| Live reload | confirm | No | Always |
| Watch debounce | number | `500` | Only if live reload = Yes |
| Verbose logging | confirm | No | Always |

### Authentication

| Prompt | Type | Default | Condition |
|--------|------|---------|-----------|
| Enable auth | select | No | Always |
| Client ID | text | - | If auth = Google |
| Client Secret | password | - | If auth = Google |
| Session Secret | select | Auto-generate | If auth = Google |
| Custom session secret | password | - | If session = custom |
| Access control | select | Anyone | If auth = Google |
| Allowed emails | text | - | If access includes emails |
| Allowed domains | text | - | If access includes domains |

### Output

| Prompt | Type | Default | Condition |
|--------|------|---------|-----------|
| Output path | text | `md-server.config.json` | Always |
| Overwrite | confirm | - | If file exists |
| New filename | text | - | If overwrite = No |

## Sample Interactions

### Minimal Config (5 prompts)

```
? Directory to serve › .
? Server port › 3000
? Enable live reload? › No
? Enable verbose logging? › No
? Protect with authentication? › No, keep it open
? Output file › md-server.config.json

✓ Configuration saved to md-server.config.json
```

### Development Config (6 prompts)

```
? Directory to serve › ./docs
? Server port › 3000
? Enable live reload? › Yes
? Watch debounce in ms › 500
? Enable verbose logging? › Yes
? Protect with authentication? › No, keep it open
? Output file › md-server.config.json

✓ Configuration saved to md-server.config.json
```

### Full Auth Config (11 prompts)

```
? Directory to serve › ./docs
? Server port › 8080
? Enable live reload? › No
? Enable verbose logging? › No
? Protect with authentication? › Yes, use Google OAuth
? Google OAuth Client ID › 123456789.apps.googleusercontent.com
? Google OAuth Client Secret › ********
? Session Secret › Auto-generate
? Who should have access? › Only specific domains
? Allowed domains › company.com, partner.org
? Output file › config.yaml

✓ Configuration saved to config.yaml
```
