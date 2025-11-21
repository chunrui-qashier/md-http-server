# Live Reload Feature - Technical Specification

**Version:** 1.0.0
**Date:** 2025-11-21
**Status:** Draft

## Table of Contents

[TOC]

---

## 1. Overview

### 1.1 Purpose
Enable automatic page reloading when markdown files are modified, improving the development and authoring workflow.

### 1.2 Scope
This specification covers the MVP implementation using Server-Sent Events (SSE) and full page reload strategy.

### 1.3 Goals
- Detect file changes within 1 second of modification
- Automatically reload affected browser pages
- Minimal performance overhead (< 5MB memory, < 3% CPU)
- Cross-platform compatibility
- Simple on/off toggle via CLI

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Browser                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Markdown Page                                        │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Content                                     │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  │  ┌─────────────────────────────────────────────┐    │  │
│  │  │  Live Reload Client                          │    │  │
│  │  │  - EventSource connection                    │    │  │
│  │  │  - Reload handler                            │    │  │
│  │  │  - Error recovery                            │    │  │
│  │  └─────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ SSE Events
                            │ (file-changed)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  SSE Endpoint                                         │  │
│  │  GET /api/watch-file?path=/path/to/file.md          │  │
│  │  - Maintains open connections                        │  │
│  │  - Sends change events                               │  │
│  │  - Handles disconnections                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  File Watcher Manager                                 │  │
│  │  - Manages active file watchers                       │  │
│  │  - Debounces changes (500ms)                          │  │
│  │  - Notifies connected clients                         │  │
│  │  - Cleanup on disconnect                              │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ File System Events
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      File System                             │
│                   (chokidar watcher)                         │
│  - Monitors file changes                                     │
│  - Cross-platform abstraction                                │
│  - Handles temp files                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Interaction Flow

```
┌──────┐         ┌────────┐         ┌────────┐         ┌──────────┐
│Client│         │ Server │         │Watcher │         │File Sys  │
└──┬───┘         └───┬────┘         └───┬────┘         └────┬─────┘
   │                 │                  │                    │
   │ 1. Load page    │                  │                    │
   ├────────────────>│                  │                    │
   │                 │                  │                    │
   │ 2. Connect SSE  │                  │                    │
   │ GET /api/watch  │                  │                    │
   ├────────────────>│                  │                    │
   │                 │                  │                    │
   │                 │ 3. Start watch   │                    │
   │                 ├─────────────────>│                    │
   │                 │                  │                    │
   │                 │ 4. Connection OK │                    │
   │<─────────────────                  │                    │
   │                 │                  │                    │
   │                 │                  │ 5. File modified   │
   │                 │                  │<───────────────────│
   │                 │                  │                    │
   │                 │ 6. Change event  │                    │
   │                 │<─────────────────│                    │
   │                 │                  │                    │
   │ 7. SSE: reload  │                  │                    │
   │<─────────────────                  │                    │
   │                 │                  │                    │
   │ 8. Reload page  │                  │                    │
   ├────────────────>│                  │                    │
   │                 │                  │                    │
   │ 9. Disconnect   │                  │                    │
   │     (on reload) │                  │                    │
   │                 │ 10. Stop watch   │                    │
   │                 ├─────────────────>│                    │
   │                 │ (if no clients)  │                    │
```

---

## 3. Detailed Component Specifications

### 3.1 File Watcher Manager

**File:** `src/file-watcher.ts`

#### 3.1.1 Class: FileWatcherManager

```typescript
interface WatcherClient {
  id: string;
  filePath: string;
  res: Response;
  lastUpdate: number;
}

class FileWatcherManager {
  private watchers: Map<string, FSWatcher>;
  private clients: Map<string, Set<WatcherClient>>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private readonly debounceDelay: number = 500;

  constructor();

  // Watch a file for a specific client
  watchFile(filePath: string, client: WatcherClient): void;

  // Stop watching for a client
  unwatchFile(clientId: string): void;

  // Notify clients of file change
  private notifyClients(filePath: string): void;

  // Cleanup inactive watchers
  private cleanup(filePath: string): void;

  // Debounce rapid changes
  private debounce(filePath: string, callback: Function): void;
}
```

#### 3.1.2 Configuration

```typescript
interface FileWatcherConfig {
  enabled: boolean;           // Enable/disable feature
  debounceDelay: number;     // Milliseconds (default: 500)
  ignoreInitial: boolean;    // Ignore initial add events
  ignored: string[];         // Patterns to ignore (.tmp, .swp, etc.)
  persistent: boolean;       // Keep process running (default: true)
}

const DEFAULT_CONFIG: FileWatcherConfig = {
  enabled: false,
  debounceDelay: 500,
  ignoreInitial: true,
  ignored: [
    '**/.git/**',
    '**/node_modules/**',
    '**/.DS_Store',
    '**/*.tmp',
    '**/*.swp',
    '**/*~',
    '**/.#*'
  ],
  persistent: true
};
```

#### 3.1.3 File Watching Logic

```typescript
import chokidar from 'chokidar';

function watchFile(filePath: string, client: WatcherClient): void {
  const absolutePath = path.resolve(filePath);

  // Create watcher if doesn't exist
  if (!this.watchers.has(absolutePath)) {
    const watcher = chokidar.watch(absolutePath, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    watcher.on('change', () => {
      this.debounce(absolutePath, () => {
        this.notifyClients(absolutePath);
      });
    });

    watcher.on('unlink', () => {
      this.notifyClients(absolutePath);
    });

    this.watchers.set(absolutePath, watcher);
  }

  // Add client to set
  if (!this.clients.has(absolutePath)) {
    this.clients.set(absolutePath, new Set());
  }
  this.clients.get(absolutePath)!.add(client);
}
```

---

### 3.2 SSE Endpoint

**File:** `src/server.ts`

#### 3.2.1 API Endpoint

```typescript
/**
 * SSE endpoint for live reload
 * GET /api/live-reload?file=<relative-path>
 */
app.get('/api/live-reload', (req: Request, res: Response) => {
  if (!config.watch.enabled) {
    return res.status(404).send('Live reload not enabled');
  }

  const filePath = req.query.file as string;
  if (!filePath) {
    return res.status(400).send('Missing file parameter');
  }

  // Validate file path (prevent traversal)
  const absolutePath = path.resolve(rootDir, filePath);
  if (!absolutePath.startsWith(rootDir)) {
    return res.status(403).send('Invalid file path');
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send('File not found');
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Generate client ID
  const clientId = generateClientId();

  // Create client object
  const client: WatcherClient = {
    id: clientId,
    filePath: absolutePath,
    res,
    lastUpdate: Date.now()
  };

  // Register watcher
  fileWatcherManager.watchFile(absolutePath, client);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', file: filePath })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    fileWatcherManager.unwatchFile(clientId);
  });

  // Keep-alive ping every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});
```

#### 3.2.2 SSE Message Format

```typescript
interface SSEMessage {
  type: 'connected' | 'change' | 'unlink' | 'error';
  file: string;
  timestamp?: number;
  message?: string;
}

// Example messages:
// data: {"type":"connected","file":"README.md"}
//
// data: {"type":"change","file":"README.md","timestamp":1700000000}
//
// data: {"type":"unlink","file":"README.md"}
//
// data: {"type":"error","message":"File watcher failed"}
```

---

### 3.3 Client-Side Implementation

**File:** `src/templates.ts` (injected script)

#### 3.3.1 Live Reload Client

```typescript
interface LiveReloadConfig {
  enabled: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
}

class LiveReloadClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts: number = 0;
  private readonly config: LiveReloadConfig;
  private readonly filePath: string;

  constructor(filePath: string, config: LiveReloadConfig) {
    this.filePath = filePath;
    this.config = config;
  }

  connect(): void {
    if (!this.config.enabled) return;

    const url = `/api/live-reload?file=${encodeURIComponent(this.filePath)}`;
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    });

    this.eventSource.addEventListener('error', () => {
      this.handleError();
    });
  }

  private handleMessage(data: SSEMessage): void {
    switch (data.type) {
      case 'connected':
        console.log('[Live Reload] Connected');
        this.reconnectAttempts = 0;
        break;

      case 'change':
        console.log('[Live Reload] File changed, reloading...');
        this.reload();
        break;

      case 'unlink':
        console.log('[Live Reload] File deleted');
        // Could show error page or redirect to directory
        break;
    }
  }

  private handleError(): void {
    console.warn('[Live Reload] Connection error, reconnecting...');
    this.disconnect();

    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts),
        10000
      );
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    }
  }

  private reload(): void {
    // Save state before reload
    this.saveState();

    // Reload page
    window.location.reload();
  }

  private saveState(): void {
    const state = {
      scrollY: window.scrollY,
      scrollX: window.scrollX,
      tocVisible: localStorage.getItem('toc-visible'),
      timestamp: Date.now()
    };
    sessionStorage.setItem('live-reload-state', JSON.stringify(state));
  }

  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
```

#### 3.3.2 State Restoration

```typescript
// Restore state after reload
function restoreState(): void {
  const stateJson = sessionStorage.getItem('live-reload-state');
  if (!stateJson) return;

  try {
    const state = JSON.parse(stateJson);

    // Only restore if recent (< 5 seconds)
    if (Date.now() - state.timestamp < 5000) {
      // Restore scroll position
      if (state.scrollY !== undefined) {
        window.scrollTo(state.scrollX || 0, state.scrollY);
      }

      // Restore TOC visibility
      if (state.tocVisible) {
        localStorage.setItem('toc-visible', state.tocVisible);
      }
    }

    // Clear state
    sessionStorage.removeItem('live-reload-state');
  } catch (error) {
    console.error('[Live Reload] Failed to restore state:', error);
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', restoreState);
```

#### 3.3.3 Injected HTML

```html
<!-- Live Reload Script (injected when watch enabled) -->
<script>
  (function() {
    // Get file path from URL or meta tag
    const filePath = document.querySelector('meta[name="file-path"]')?.content;
    if (!filePath) return;

    // Configuration
    const config = {
      enabled: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 5
    };

    // Initialize client
    const liveReload = new LiveReloadClient(filePath, config);
    liveReload.connect();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      liveReload.disconnect();
    });
  })();
</script>
```

---

### 3.4 CLI Configuration

**File:** `src/cli.ts`

#### 3.4.1 Command Line Options

```typescript
program
  .option('-w, --watch', 'Enable live reload (default: false)')
  .option('--watch-debounce <ms>', 'Debounce delay for file changes (default: 500)', '500')
```

#### 3.4.2 Server Options Interface

```typescript
export interface ServerOptions {
  port: number;
  directory: string;
  verbose?: boolean;
  watch?: {
    enabled: boolean;
    debounceDelay: number;
  };
}
```

---

## 4. Data Models

### 4.1 Configuration

```typescript
interface LiveReloadConfig {
  // Server-side
  server: {
    enabled: boolean;
    debounceDelay: number;
    maxConnections: number;
    keepAliveInterval: number;
  };

  // File watching
  watcher: {
    ignored: string[];
    persistent: boolean;
    awaitWriteFinish: {
      stabilityThreshold: number;
      pollInterval: number;
    };
  };

  // Client-side
  client: {
    reconnectDelay: number;
    maxReconnectAttempts: number;
    stateRestoration: boolean;
  };
}
```

### 4.2 Runtime State

```typescript
interface WatcherState {
  activeWatchers: Map<string, FSWatcher>;
  activeClients: Map<string, Set<WatcherClient>>;
  debounceTimers: Map<string, NodeJS.Timeout>;
  statistics: {
    totalConnections: number;
    activeConnections: number;
    filesWatched: number;
    changeEvents: number;
    errors: number;
  };
}
```

---

## 5. API Specification

### 5.1 SSE Endpoint

#### GET /api/live-reload

**Query Parameters:**
- `file` (required): Relative path to markdown file

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Response Format:**
```
data: {"type":"connected","file":"README.md"}

data: {"type":"change","file":"README.md","timestamp":1700000000}

: keep-alive

data: {"type":"unlink","file":"README.md"}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid file parameter
- `403 Forbidden`: File path outside served directory
- `404 Not Found`: Feature disabled or file not found
- `500 Internal Server Error`: Watcher initialization failed

---

## 6. Security Considerations

### 6.1 Path Traversal Prevention

```typescript
function validateFilePath(requestedPath: string, rootDir: string): boolean {
  const absolutePath = path.resolve(rootDir, requestedPath);
  return absolutePath.startsWith(rootDir);
}
```

### 6.2 Rate Limiting

```typescript
// Limit connections per client
const MAX_CONNECTIONS_PER_IP = 10;
const connectionCounts = new Map<string, number>();

function checkRateLimit(clientIp: string): boolean {
  const count = connectionCounts.get(clientIp) || 0;
  if (count >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }
  connectionCounts.set(clientIp, count + 1);
  return true;
}
```

### 6.3 Resource Limits

```typescript
// Maximum files to watch simultaneously
const MAX_WATCHED_FILES = 100;

// Maximum clients per file
const MAX_CLIENTS_PER_FILE = 50;

// Connection timeout
const CONNECTION_TIMEOUT = 300000; // 5 minutes
```

---

## 7. Error Handling

### 7.1 Server-Side Errors

| Error | Handling Strategy |
|-------|------------------|
| File watcher initialization fails | Log error, disable feature gracefully |
| File doesn't exist | Return 404, close connection |
| Too many watchers | Return 503, suggest reducing open tabs |
| Client disconnect during send | Clean up resources, log if verbose |
| Debounce timer error | Log error, notify anyway |

### 7.2 Client-Side Errors

| Error | Handling Strategy |
|-------|------------------|
| EventSource connection fails | Retry with exponential backoff |
| Max reconnect attempts reached | Show user notification, disable feature |
| State restoration fails | Log warning, continue without state |
| Malformed SSE message | Log error, ignore message |

---

## 8. Performance Considerations

### 8.1 Memory Management

```typescript
// Clean up inactive connections every 5 minutes
setInterval(() => {
  const now = Date.now();
  const TIMEOUT = 300000; // 5 minutes

  for (const [filePath, clients] of fileWatcherManager.clients) {
    for (const client of clients) {
      if (now - client.lastUpdate > TIMEOUT) {
        fileWatcherManager.unwatchFile(client.id);
      }
    }
  }
}, 300000);
```

### 8.2 CPU Optimization

- Debounce file changes (500ms default)
- Use `awaitWriteFinish` to avoid partial reads
- Limit maximum watched files
- Lazy initialization of watchers

### 8.3 Network Optimization

- Keep-alive pings every 30 seconds (not too frequent)
- Compress SSE messages (gzip)
- Batch notifications if multiple changes
- Close idle connections after 5 minutes

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
describe('FileWatcherManager', () => {
  it('should watch a file when client connects');
  it('should notify clients on file change');
  it('should debounce rapid changes');
  it('should clean up when all clients disconnect');
  it('should handle file deletion');
});

describe('SSE Endpoint', () => {
  it('should establish SSE connection');
  it('should validate file paths');
  it('should prevent path traversal');
  it('should handle disconnections gracefully');
});
```

### 9.2 Integration Tests

```typescript
describe('Live Reload End-to-End', () => {
  it('should reload page when file changes');
  it('should reconnect after connection loss');
  it('should restore scroll position');
  it('should handle multiple clients');
  it('should work with rapid changes');
});
```

### 9.3 Manual Testing Checklist

- [ ] Single file watching
- [ ] Multiple files simultaneously
- [ ] Multiple browser tabs
- [ ] Rapid file changes (< 100ms apart)
- [ ] Large file changes (> 1MB)
- [ ] File deletion while watching
- [ ] File rename while watching
- [ ] Connection loss and recovery
- [ ] Browser refresh during watch
- [ ] Server restart during watch
- [ ] Cross-platform (Windows, macOS, Linux)
- [ ] Different editors (VS Code, Vim, Nano, etc.)

---

## 10. Deployment

### 10.1 Dependencies

**New Package:**
```json
{
  "dependencies": {
    "chokidar": "^3.5.3"
  }
}
```

**Bundle Size Impact:**
- Server: +150KB (chokidar)
- Client: +5KB (SSE client code)
- Total: ~155KB

### 10.2 Backwards Compatibility

- Feature is disabled by default (no breaking changes)
- CLI flag required to enable (`--watch`)
- No impact on existing functionality when disabled
- Graceful degradation if feature fails

### 10.3 Configuration

**Default Configuration:**
```javascript
{
  watch: {
    enabled: false,
    debounceDelay: 500,
    maxConnections: 100,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5
  }
}
```

---

## 11. Future Enhancements

### Phase 2: Partial Updates
- Replace content without full reload
- Preserve all user interactions
- Update only changed sections

### Phase 3: Advanced Features
- Multiple file watching
- Directory watching
- Change diff display
- Collaborative editing indicators
- Custom reload strategies

---

## 12. References

### 12.1 Specifications
- [Server-Sent Events (SSE) Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [EventSource MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Chokidar Documentation](https://github.com/paulmillr/chokidar)

### 12.2 Similar Implementations
- [Vite Dev Server](https://github.com/vitejs/vite)
- [Browsersync](https://github.com/BrowserSync/browser-sync)
- [LiveReload](https://github.com/livereload/livereload-js)

---

## 13. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Author | Claude | 2025-11-21 | |
| Technical Reviewer | | | |
| Product Owner | | | |

---

**Document Version History:**
- v1.0.0 (2025-11-21): Initial specification
