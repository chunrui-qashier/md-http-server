import express, { Request, Response, NextFunction } from 'express';
import { marked } from 'marked';
import * as fs from 'fs';
import * as path from 'path';
import { getMarkdownTemplate, getDirectoryTemplate } from './templates';
import { FileWatcherManager, WatcherClient } from './watcher';
import { randomUUID } from 'crypto';

export interface ServerOptions {
  port: number;
  directory: string;
  verbose?: boolean;
  watch?: boolean;
  watchDebounce?: number;
}

/**
 * Create and configure the markdown server
 */
export function createServer(options: ServerOptions) {
  const app = express();
  const { port, directory, verbose = false, watch = false, watchDebounce = 500 } = options;

  // Resolve the absolute path
  const rootDir = path.resolve(directory);

  // Initialize file watcher manager if watch is enabled
  const fileWatcher = watch ? new FileWatcherManager(watchDebounce) : null;

  // Verify directory exists
  if (!fs.existsSync(rootDir)) {
    throw new Error(`Directory does not exist: ${rootDir}`);
  }

  if (!fs.statSync(rootDir).isDirectory()) {
    throw new Error(`Path is not a directory: ${rootDir}`);
  }

  // Configure marked for security and mermaid support
  const renderer = new marked.Renderer();
  const originalCodeRenderer = renderer.code.bind(renderer);

  renderer.code = function(code: string, language: string | undefined, isEscaped: boolean) {
    // Handle mermaid diagrams
    if (language === 'mermaid') {
      return `<pre class="mermaid">${code}</pre>`;
    }
    // Use default rendering for other code blocks
    return originalCodeRenderer(code, language, isEscaped);
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer: renderer,
  });

  // Logging middleware
  if (verbose) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  // SSE endpoint for live reload
  app.get('/api/live-reload', (req: Request, res: Response) => {
    if (!fileWatcher) {
      return res.status(503).json({ error: 'Live reload is not enabled' });
    }

    const fileParam = req.query.file as string;
    if (!fileParam) {
      return res.status(400).json({ error: 'Missing file parameter' });
    }

    // Validate and resolve file path
    const safePath = path.normalize(fileParam).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(rootDir, safePath);

    // Ensure the resolved path is within the root directory
    if (!fullPath.startsWith(rootDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', filePath: fullPath, timestamp: Date.now() })}\n\n`);

    // Create client
    const client: WatcherClient = {
      id: randomUUID(),
      filePath: fullPath,
      res,
      lastUpdate: Date.now(),
    };

    // Register client with file watcher
    fileWatcher.watchFile(fullPath, client);

    if (verbose) {
      console.log(`[LiveReload] Client ${client.id} connected for ${fullPath}`);
    }

    // Handle client disconnect
    req.on('close', () => {
      fileWatcher.unwatchFile(client.id);
      if (verbose) {
        console.log(`[LiveReload] Client ${client.id} disconnected`);
      }
    });
  });

  // Main request handler
  app.get('*', async (req: Request, res: Response) => {
    try {
      // Decode and sanitize the request path
      const requestPath = decodeURIComponent(req.path);

      // Prevent path traversal attacks
      const safePath = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(rootDir, safePath);

      // Ensure the resolved path is within the root directory
      if (!fullPath.startsWith(rootDir)) {
        return res.status(403).send('Forbidden: Access denied');
      }

      // Check if path exists
      if (!fs.existsSync(fullPath)) {
        return res.status(404).send('Not found');
      }

      const stats = fs.statSync(fullPath);

      // Handle directories
      if (stats.isDirectory()) {
        return handleDirectory(fullPath, requestPath, res);
      }

      // Handle markdown files
      if (fullPath.endsWith('.md')) {
        return handleMarkdownFile(fullPath, res);
      }

      // Serve other files as-is
      return res.sendFile(fullPath);

    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).send('Internal server error');
    }
  });

  /**
   * Handle directory listing
   */
  function handleDirectory(fullPath: string, requestPath: string, res: Response) {
    const files = fs.readdirSync(fullPath);

    const fileList = files
      .map(file => {
        const filePath = path.join(fullPath, file);
        const isDirectory = fs.statSync(filePath).isDirectory();
        const relativePath = path.join(requestPath, file);

        return {
          name: file,
          isDirectory,
          path: relativePath.endsWith('/') ? relativePath : relativePath + (isDirectory ? '/' : '')
        };
      })
      .sort((a, b) => {
        // Directories first, then alphabetically
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    // Add parent directory link if not at root
    if (requestPath !== '/') {
      const parentPath = path.dirname(requestPath);
      fileList.unshift({
        name: '..',
        isDirectory: true,
        path: parentPath === '/' ? '/' : parentPath + '/'
      });
    }

    const html = getDirectoryTemplate(requestPath, fileList);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * Extract headings from markdown for TOC generation
   */
  function extractHeadings(markdown: string): Array<{ level: number; text: string; id: string }> {
    const headings: Array<{ level: number; text: string; id: string }> = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      // Match ATX headings (# Heading)
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        // Generate slug for ID
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        headings.push({ level, text, id });
      }
    }

    return headings;
  }

  /**
   * Generate TOC HTML from headings
   */
  function generateTocHtml(headings: Array<{ level: number; text: string; id: string }>): string {
    if (headings.length === 0) return '';

    let html = '<nav class="toc-list">\n';
    let currentLevel = 0;

    for (const heading of headings) {
      // Skip h1 headings in TOC (usually document title)
      if (heading.level === 1) continue;

      while (currentLevel < heading.level - 1) {
        html += '<ul>\n';
        currentLevel++;
      }
      while (currentLevel > heading.level - 1) {
        html += '</ul>\n';
        currentLevel--;
      }

      html += `<li><a href="#${heading.id}" class="toc-link" data-level="${heading.level}">${heading.text}</a></li>\n`;
    }

    while (currentLevel > 0) {
      html += '</ul>\n';
      currentLevel--;
    }

    html += '</nav>';
    return html;
  }

  /**
   * Handle markdown file rendering
   */
  async function handleMarkdownFile(fullPath: string, res: Response) {
    const markdownContent = fs.readFileSync(fullPath, 'utf-8');

    // Extract headings for TOC
    const headings = extractHeadings(markdownContent);

    // Add IDs to headings in the renderer
    const headingRenderer = renderer.heading.bind(renderer);
    renderer.heading = function(text: string, level: number) {
      const plainText = text.replace(/<[^>]*>/g, '');
      const id = plainText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return `<h${level} id="${id}">${text}</h${level}>`;
    };

    // Convert markdown to HTML
    let htmlContent = await marked.parse(markdownContent);

    // Replace [TOC] placeholder with manual TOC
    const tocHtml = generateTocHtml(headings);
    htmlContent = htmlContent.replace(/<p>\[TOC\]<\/p>/gi, `<div class="manual-toc">${tocHtml}</div>`);
    htmlContent = htmlContent.replace(/<p>\[\[toc\]\]<\/p>/gi, `<div class="manual-toc">${tocHtml}</div>`);

    // Get the file name for the title
    const fileName = path.basename(fullPath, '.md');

    // Wrap in HTML template with TOC data and watch flag
    const html = getMarkdownTemplate(fileName, htmlContent, tocHtml, watch);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  return {
    app,
    start: () => {
      return new Promise<void>((resolve, reject) => {
        try {
          const server = app.listen(port, () => {
            console.log(`\nMarkdown Server running at:`);
            console.log(`  Local:   http://localhost:${port}`);
            console.log(`  Serving: ${rootDir}`);
            if (watch) {
              console.log(`  Live Reload: Enabled (debounce: ${watchDebounce}ms)`);
            }
            console.log(`\nPress Ctrl+C to stop\n`);
            resolve();
          });

          server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              reject(new Error(`Port ${port} is already in use`));
            } else {
              reject(error);
            }
          });

          // Cleanup on shutdown
          const cleanup = () => {
            if (fileWatcher) {
              fileWatcher.cleanup();
            }
            server.close();
          };

          process.on('SIGINT', cleanup);
          process.on('SIGTERM', cleanup);
        } catch (error) {
          reject(error);
        }
      });
    },
    cleanup: () => {
      if (fileWatcher) {
        fileWatcher.cleanup();
      }
    }
  };
}
