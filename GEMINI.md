# Project Context: md-http-server

## 1. Project Overview
`md-http-server` is a TypeScript-based HTTP server designed to render Markdown files as HTML on the fly. It functions primarily as a CLI tool but exposes a programmatic API for library usage. The project prioritizes zero-configuration usage with "GitHub-flavored" default styling.

## 2. Technical Architecture

### Core Technologies
- **Runtime:** Node.js (>=18.0.0)
- **Language:** TypeScript (Strict mode enabled, ES2020 target)
- **Server:** Express.js
- **Markdown Engine:** `marked` (configured with GFM enabled)
- **CLI Framework:** `commander`

### Directory Structure
- `src/`: Source code (compiles to `dist/`)
    - `cli.ts`: Entry point. Handles arg parsing and process signals.
    - `server.ts`: Core server factory. Handles routing, security checks, and request dispatching.
    - `templates.ts`: HTML generation logic (CSS + Layouts).
    - `index.ts`: Public API exports.
- `test-content/`: Sample markdown files used for manual verification/testing.
- `dist/`: Compiled JavaScript output (not committed).

### Data Flow
1.  **Request:** User requests a path (e.g., `/folder/doc.md`).
2.  **Validation:** `server.ts` sanitizes the path to prevent directory traversal.
3.  **Resolution:**
    - If **Directory**: `handleDirectory` generates a file listing HTML page.
    - If **.md File**: `handleMarkdownFile` reads content, parses via `marked`, and wraps it in `getMarkdownTemplate`.
    - If **Other**: Served as a static file.
4.  **Response:** HTML or static content returned to client.

## 3. Development Workflows

### Building
The project uses `tsc` for building.
```bash
npm run build    # Compiles src/ to dist/
npm run dev      # Watch mode for development
```

### Running
The CLI code is in `dist/cli.js`.
```bash
# Run from source (after build)
node dist/cli.js [directory] [options]

# Common dev usage (serve the test content)
npm run build
node dist/cli.js ./test-content
```

### Testing Strategy
**Note:** The `README.md` mentions `npm test`, but **no test script exists** in `package.json`.
Testing is currently **manual**:
1.  Build the project.
2.  Run the server against the `test-content/` directory.
3.  Manually verify that `guide.md` and `examples/example.md` render correctly in the browser.

## 4. Coding Conventions
- **Style:** 2-space indentation, single quotes for strings, semicolons used.
- **Imports:** explicit extensions not used in imports; `import * as fs` pattern used for Node built-ins.
- **Type Safety:** `strict: true` is enabled in `tsconfig.json`. Ensure all new code satisfies strict null checks and explicit typing.
- **Error Handling:** Async/await with try/catch blocks in top-level route handlers.

## 5. Critical Files & Symbols
| File | Symbol | Description |
| :--- | :--- | :--- |
| `src/server.ts` | `createServer` | Main factory function. Accepts `ServerOptions` (port, dir, verbose). |
| `src/templates.ts` | `getMarkdownTemplate` | Injects rendered HTML into the full page template (contains the CSS). |
| `src/templates.ts` | `getDirectoryTemplate`| Generates the file explorer view HTML. |
| `src/cli.ts` | `program` | Commander instance defining CLI flags (`-p`, `-v`). |