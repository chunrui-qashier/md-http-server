# Live Reload Feature - Implementation Plan

**Version:** 1.0.0
**Date:** 2025-11-21
**Estimated Duration:** 8-12 hours
**Status:** Ready for Implementation

## Table of Contents

[TOC]

---

## 1. Executive Summary

This document outlines the step-by-step implementation plan for adding live reload functionality to md-http-server. The implementation is divided into 6 phases, each with clear deliverables and success criteria.

### Implementation Strategy
- **Approach:** Incremental development with testing at each phase
- **Method:** SSE-based live reload with full page refresh
- **Testing:** Unit tests + integration tests + manual testing
- **Timeline:** 1-2 days for MVP, +1 day for polish and testing

---

## 2. Prerequisites

### 2.1 Development Environment
- [ ] Node.js 18+ installed
- [ ] TypeScript 5.3+ installed
- [ ] Git configured
- [ ] IDE/editor set up (VS Code recommended)

### 2.2 Knowledge Requirements
- [x] Understanding of Server-Sent Events (SSE)
- [x] File system watching concepts
- [x] Express.js middleware patterns
- [x] TypeScript interfaces and types
- [x] Event-driven programming

### 2.3 Tools Setup
```bash
# Install dev dependencies
npm install --save-dev @types/chokidar

# Install runtime dependency
npm install chokidar

# Verify TypeScript compilation works
npm run build
```

---

## 3. Implementation Phases

### Phase 1: File Watcher Foundation (2-3 hours)

#### 1.1 Create File Watcher Module

**File:** `src/file-watcher.ts`

**Tasks:**
1. [ ] Create `FileWatcherManager` class
2. [ ] Implement `watchFile()` method
3. [ ] Implement `unwatchFile()` method
4. [ ] Add debouncing logic
5. [ ] Add cleanup logic
6. [ ] Write unit tests

**Code Structure:**
```typescript
// src/file-watcher.ts
import chokidar, { FSWatcher } from 'chokidar';
import { Response } from 'express';

export interface WatcherClient {
  id: string;
  filePath: string;
  res: Response;
  lastUpdate: number;
}

export class FileWatcherManager {
  // ... implementation
}
```

**Test Cases:**
```typescript
// src/__tests__/file-watcher.test.ts
describe('FileWatcherManager', () => {
  it('should create watcher for new file');
  it('should reuse watcher for same file');
  it('should notify all clients on change');
  it('should debounce rapid changes');
  it('should cleanup when last client disconnects');
});
```

**Success Criteria:**
- [ ] Can watch single file
- [ ] Can watch multiple files
- [ ] Debouncing works correctly
- [ ] Cleanup doesn't leak memory
- [ ] All unit tests pass

**Estimated Time:** 2-3 hours

---

### Phase 2: SSE Endpoint (2-3 hours)

#### 2.1 Add SSE Route to Server

**File:** `src/server.ts`

**Tasks:**
1. [ ] Import `FileWatcherManager`
2. [ ] Create SSE endpoint handler
3. [ ] Add path validation
4. [ ] Implement connection management
5. [ ] Add keep-alive mechanism
6. [ ] Handle disconnections
7. [ ] Write integration tests

**Code Implementation:**
```typescript
// In createServer() function
const fileWatcherManager = new FileWatcherManager();

app.get('/api/live-reload', (req, res) => {
  // Implementation from tech spec
});
```

**Test Cases:**
```typescript
describe('SSE Endpoint', () => {
  it('should establish SSE connection');
  it('should reject invalid paths');
  it('should send keep-alive pings');
  it('should handle disconnection');
  it('should prevent path traversal');
});
```

**Success Criteria:**
- [ ] SSE connection establishes successfully
- [ ] Receives connected event
- [ ] Receives change event on file modification
- [ ] Keep-alive pings sent every 30s
- [ ] Clean disconnect on client close
- [ ] Path validation prevents traversal
- [ ] All integration tests pass

**Estimated Time:** 2-3 hours

---

### Phase 3: Client-Side Implementation (2-3 hours)

#### 3.1 Add Live Reload Client Script

**File:** `src/templates.ts`

**Tasks:**
1. [ ] Create `LiveReloadClient` class
2. [ ] Implement EventSource connection
3. [ ] Add reconnection logic
4. [ ] Implement state saving/restoration
5. [ ] Add error handling
6. [ ] Inject script into HTML template

**Code Structure:**
```typescript
// In getMarkdownTemplate()
const liveReloadScript = options.watch?.enabled ? `
  <meta name="file-path" content="${filePath}">
  <script>
    // LiveReloadClient implementation
  </script>
` : '';

return `
  <!DOCTYPE html>
  <html>
    <head>
      ${liveReloadScript}
      <!-- rest of head -->
    </head>
    ...
  </html>
`;
```

**Test Strategy:**
- Manual testing with browser DevTools
- Monitor EventSource connection
- Verify reconnection behavior
- Test state restoration

**Success Criteria:**
- [ ] Client connects to SSE endpoint
- [ ] Receives and logs events
- [ ] Reloads on change event
- [ ] Reconnects after disconnect
- [ ] Saves state before reload
- [ ] Restores state after reload
- [ ] No console errors

**Estimated Time:** 2-3 hours

---

### Phase 4: CLI Integration (1 hour)

#### 4.1 Add Command Line Options

**File:** `src/cli.ts`

**Tasks:**
1. [ ] Add `--watch` flag
2. [ ] Add `--watch-debounce` option
3. [ ] Update `ServerOptions` interface
4. [ ] Pass options to server
5. [ ] Update help text

**Code Changes:**
```typescript
program
  .option('-w, --watch', 'Enable live reload')
  .option('--watch-debounce <ms>', 'Debounce delay (default: 500)', '500')
  .action(async (directory, options) => {
    const server = createServer({
      port: parseInt(options.port),
      directory: resolvedDirectory,
      verbose: options.verbose,
      watch: {
        enabled: options.watch || false,
        debounceDelay: parseInt(options.watchDebounce)
      }
    });
    // ...
  });
```

**Success Criteria:**
- [ ] `--watch` flag enables feature
- [ ] `--watch-debounce` sets delay
- [ ] Help text shows new options
- [ ] Options passed to server correctly
- [ ] Server starts with watch enabled

**Estimated Time:** 1 hour

---

### Phase 5: Testing & Bug Fixes (1-2 hours)

#### 5.1 Comprehensive Testing

**Test Matrix:**

| Test Case | Platform | Browser | Status |
|-----------|----------|---------|--------|
| Single file watch | macOS | Chrome | |
| Multiple files | macOS | Firefox | |
| Multiple tabs | Linux | Edge | |
| Rapid changes | Linux | Chrome | |
| Connection loss | Windows | Firefox | |
| File deletion | Windows | Chrome | |
| Large file (>1MB) | macOS | Safari | |
| State restoration | Linux | Chrome | |

**Manual Test Script:**
```bash
# Terminal 1: Start server with watch
node dist/cli.js test-content --watch -v

# Terminal 2: Edit file
echo "# Test" > test-content/test.md

# Terminal 3: Watch for changes
# (Open browser to http://localhost:3000/test.md)

# Verify:
# 1. Page loads correctly
# 2. Modify file: echo "## Update" >> test-content/test.md
# 3. Page reloads automatically
# 4. Scroll position maintained
# 5. No errors in console
```

**Automated Tests:**
```typescript
describe('End-to-End Live Reload', () => {
  it('should reload on file change', async () => {
    // Start server with watch
    // Connect client
    // Modify file
    // Verify reload triggered
  });

  it('should handle multiple clients', async () => {
    // Connect 2 clients
    // Modify file
    // Verify both reload
  });

  it('should reconnect after disconnect', async () => {
    // Connect client
    // Kill server
    // Restart server
    // Verify reconnection
  });
});
```

**Bug Fix Checklist:**
- [ ] Memory leaks in watcher
- [ ] Race conditions in debounce
- [ ] State restoration timing issues
- [ ] Cross-platform path handling
- [ ] Browser compatibility issues

**Success Criteria:**
- [ ] All automated tests pass
- [ ] All manual tests pass
- [ ] No memory leaks over 1 hour
- [ ] Works on macOS, Linux, Windows
- [ ] Works in Chrome, Firefox, Safari, Edge

**Estimated Time:** 1-2 hours

---

### Phase 6: Documentation & Polish (1 hour)

#### 6.1 Update Documentation

**Files to Update:**
1. [ ] `README.md` - Add live reload section
2. [ ] `package.json` - Update description
3. [ ] `CHANGELOG.md` - Add version entry

**README.md Updates:**
```markdown
## Live Reload

Enable automatic page reloading when markdown files change:

\`\`\`bash
# Enable live reload
npx md-http-server --watch

# With custom debounce delay
npx md-http-server --watch --watch-debounce 1000
\`\`\`

### How It Works

1. The server monitors the currently viewed file
2. When the file changes, a notification is sent to the browser
3. The page reloads automatically
4. Your scroll position and TOC state are preserved

### Configuration

- `--watch`: Enable live reload (default: false)
- `--watch-debounce <ms>`: Debounce delay in milliseconds (default: 500)

### Editor Integration

Live reload works with all editors including:
- VS Code
- Vim
- Nano
- Sublime Text
- Atom
```

**CHANGELOG.md Entry:**
```markdown
## [1.3.0] - 2025-11-21

### Added
- Live reload feature with automatic page refresh on file changes
- `--watch` CLI flag to enable live reload
- `--watch-debounce` option to configure change detection delay
- State preservation for scroll position and TOC sidebar
- Automatic reconnection on connection loss

### Technical
- Server-Sent Events (SSE) for real-time communication
- File system watching with chokidar
- Debounced change detection
- Cross-platform compatibility
```

#### 6.2 Code Cleanup

**Tasks:**
- [ ] Remove console.log statements (replace with verbose logging)
- [ ] Add JSDoc comments
- [ ] Format code with Prettier
- [ ] Run ESLint
- [ ] Update TypeScript types

#### 6.3 Performance Optimization

**Tasks:**
- [ ] Profile memory usage
- [ ] Optimize debounce timing
- [ ] Test with 100+ files
- [ ] Measure reload time
- [ ] Optimize client script size

**Success Criteria:**
- [ ] Documentation is clear and complete
- [ ] Code is clean and well-commented
- [ ] No linting errors
- [ ] Performance meets targets
- [ ] Ready for release

**Estimated Time:** 1 hour

---

## 4. File Structure

### New Files
```
src/
├── file-watcher.ts           # New: File watching manager
└── __tests__/
    └── file-watcher.test.ts   # New: Watcher tests
```

### Modified Files
```
src/
├── server.ts                  # Modified: Add SSE endpoint
├── templates.ts               # Modified: Inject live reload script
├── cli.ts                     # Modified: Add --watch flag
└── index.ts                   # Modified: Export types

package.json                   # Modified: Add chokidar dependency
README.md                      # Modified: Add live reload docs
CHANGELOG.md                   # Modified: Add version entry
```

---

## 5. Testing Strategy

### 5.1 Unit Tests (Jest)

**Coverage Target:** 80%

```typescript
// src/__tests__/file-watcher.test.ts
describe('FileWatcherManager', () => {
  let watcher: FileWatcherManager;

  beforeEach(() => {
    watcher = new FileWatcherManager();
  });

  afterEach(async () => {
    await watcher.closeAll();
  });

  // Tests...
});
```

### 5.2 Integration Tests

```typescript
// src/__tests__/live-reload.integration.test.ts
describe('Live Reload Integration', () => {
  let server: Express;
  let port: number;

  beforeAll(async () => {
    server = createServer({
      port: 0,
      directory: './test-content',
      watch: { enabled: true, debounceDelay: 100 }
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  // Tests...
});
```

### 5.3 Manual Testing Checklist

**Development Workflow:**
- [ ] Start server with `--watch`
- [ ] Open markdown file in browser
- [ ] Edit file in VS Code
- [ ] Verify page reloads
- [ ] Check scroll position preserved
- [ ] Verify TOC state maintained

**Edge Cases:**
- [ ] Delete file while viewing
- [ ] Rename file while viewing
- [ ] Save empty file
- [ ] Save very large file (>10MB)
- [ ] Rapid saves (<100ms apart)
- [ ] Multiple tabs same file
- [ ] Multiple tabs different files

**Error Scenarios:**
- [ ] Server restart during watch
- [ ] Network disconnect
- [ ] File permission change
- [ ] Disk full during save
- [ ] Editor crash

---

## 6. Rollout Plan

### 6.1 Version Strategy

**Version:** 1.3.0 (minor version bump)

**Reason:** New feature, backwards compatible

### 6.2 Release Checklist

**Pre-Release:**
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] No console errors or warnings
- [ ] Performance benchmarks met
- [ ] Cross-platform tested

**Release:**
- [ ] Update package.json version to 1.3.0
- [ ] Run `npm run build`
- [ ] Create git tag `v1.3.0`
- [ ] Push to GitHub
- [ ] Publish to npm with `npm publish`

**Post-Release:**
- [ ] Monitor npm downloads
- [ ] Watch for GitHub issues
- [ ] Collect user feedback
- [ ] Plan Phase 2 features

### 6.3 Communication

**Release Notes:**
```markdown
# v1.3.0 - Live Reload Support 🔄

We're excited to announce live reload support! Your markdown pages now automatically refresh when you edit files.

## What's New

✨ **Live Reload**: Enable with `--watch` flag
⚡ **Fast Updates**: Changes detected within 1 second
💾 **State Preservation**: Scroll position and TOC state maintained
🔄 **Auto-Reconnect**: Handles connection issues gracefully

## Usage

\`\`\`bash
npx md-http-server --watch
\`\`\`

## Learn More

Read the updated documentation at https://github.com/chunrui-qashier/md-http-server
```

---

## 7. Risk Mitigation

### 7.1 High-Priority Risks

| Risk | Mitigation | Owner | Status |
|------|-----------|-------|--------|
| Memory leaks from watchers | Implement cleanup, use WeakMap | Dev | |
| Cross-platform issues | Use chokidar, test all platforms | Dev | |
| Connection drops | Auto-reconnect with backoff | Dev | |
| State loss on reload | Save/restore mechanism | Dev | |

### 7.2 Contingency Plans

**If SSE doesn't work:**
- Fallback to WebSocket
- Fallback to polling (last resort)

**If chokidar has issues:**
- Fallback to native fs.watch
- Document platform limitations

**If performance is poor:**
- Add rate limiting
- Reduce debounce frequency
- Make watch opt-in only

---

## 8. Success Metrics

### 8.1 Technical Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Change detection latency | < 1s | |
| Reload time | < 500ms | |
| Memory overhead | < 10MB | |
| CPU overhead | < 5% | |
| Test coverage | > 80% | |
| Bundle size increase | < 200KB | |

### 8.2 User Experience Metrics

| Metric | Target |
|--------|--------|
| Time to setup | < 1 minute |
| False positive reloads | < 1% |
| User satisfaction | > 90% |
| GitHub stars increase | +10% |

---

## 9. Timeline

### Gantt Chart (ASCII)

```
Week 1:
Day 1: [========] Phase 1: File Watcher (8h)
Day 2: [========] Phase 2: SSE Endpoint (8h)
       [====] Phase 3: Client (4h)
Day 3: [====] Phase 3: Client cont. (4h)
       [==] Phase 4: CLI (2h)
       [==] Phase 5: Testing (2h)
Day 4: [====] Phase 5: Testing cont. (4h)
       [==] Phase 6: Docs (2h)
       [==] Release prep (2h)
```

### Milestones

| Milestone | Date | Status |
|-----------|------|--------|
| Phase 1 Complete | Day 1 | |
| Phase 2 Complete | Day 2 | |
| Phase 3 Complete | Day 2 | |
| Phase 4 Complete | Day 3 | |
| MVP Ready | Day 3 | |
| Testing Complete | Day 4 | |
| Documentation Done | Day 4 | |
| Release | Day 4 | |

---

## 10. Post-Implementation

### 10.1 Monitoring

**Metrics to Track:**
- npm download count
- GitHub issue reports
- Performance reports from users
- Platform-specific issues

**Logging:**
```typescript
if (verbose) {
  console.log('[Live Reload] File watcher started');
  console.log('[Live Reload] Client connected:', clientId);
  console.log('[Live Reload] Change detected:', filePath);
  console.log('[Live Reload] Notified clients:', count);
}
```

### 10.2 Future Improvements

**Phase 2 (v1.4.0):**
- Partial content updates (no full reload)
- State preservation for diagrams
- Visual reload indicator
- Client-side toggle button

**Phase 3 (v1.5.0):**
- Directory watching
- Multi-file change batching
- Custom reload strategies
- Hot module replacement

---

## 11. Support & Maintenance

### 11.1 Common Issues

| Issue | Solution |
|-------|----------|
| "Live reload not working" | Check `--watch` flag enabled |
| "Too many reloads" | Increase debounce delay |
| "State not preserved" | Clear sessionStorage |
| "Connection keeps dropping" | Check firewall settings |

### 11.2 Troubleshooting Guide

```bash
# Enable verbose logging
md-http-server --watch --verbose

# Test with single file
md-http-server test.md --watch

# Check network tab in browser DevTools
# Look for /api/live-reload connection

# Monitor server logs
# Should see "Client connected" messages
```

---

## 12. Sign-Off

### 12.1 Approval Matrix

| Role | Name | Date | Approval |
|------|------|------|----------|
| Technical Lead | | | [ ] |
| QA Lead | | | [ ] |
| Product Owner | | | [ ] |
| Security Review | | | [ ] |

### 12.2 Ready for Implementation

**Prerequisites Met:**
- [ ] All reviewers have approved
- [ ] Resources allocated
- [ ] Timeline agreed upon
- [ ] Success criteria defined
- [ ] Risk mitigation planned

**Start Date:** _____________
**Expected Completion:** _____________
**Assigned To:** _____________

---

## Appendix A: Quick Reference

### Commands
```bash
# Development
npm run dev --watch

# Testing
npm test
npm run test:watch
npm run test:coverage

# Building
npm run build

# Running
node dist/cli.js --watch
node dist/cli.js --watch --watch-debounce 1000
```

### Key Files
- `src/file-watcher.ts` - Core watching logic
- `src/server.ts` - SSE endpoint
- `src/templates.ts` - Client script
- `src/cli.ts` - CLI options

### Dependencies
- `chokidar` - File watching
- Native SSE - EventSource API

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-21
**Status:** ✅ Ready for Implementation
