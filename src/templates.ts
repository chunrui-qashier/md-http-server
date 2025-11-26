/**
 * HTML template for rendering markdown content
 */
export function getMarkdownTemplate(title: string, content: string, tocHtml: string = '', watchEnabled: boolean = false): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #24292e;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #f6f8fa;
    }

    .markdown-body {
      background: white;
      padding: 3rem;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }

    h1 {
      font-size: 2em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }

    h2 {
      font-size: 1.5em;
      border-bottom: 1px solid #eaecef;
      padding-bottom: 0.3em;
    }

    h3 {
      font-size: 1.25em;
    }

    p {
      margin-top: 0;
      margin-bottom: 16px;
    }

    a {
      color: #0366d6;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      background: rgba(27,31,35,0.05);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }

    pre {
      background: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      line-height: 1.45;
    }

    pre code {
      background: none;
      padding: 0;
      font-size: 100%;
    }

    blockquote {
      border-left: 0.25em solid #dfe2e5;
      padding: 0 1em;
      color: #6a737d;
      margin: 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 0;
      margin-bottom: 16px;
      display: block;
      overflow-x: auto;
    }

    table th,
    table td {
      border: 1px solid #dfe2e5;
      padding: 6px 13px;
    }

    table th {
      background: #f6f8fa;
      font-weight: 600;
    }

    table tr:nth-child(2n) {
      background: #f6f8fa;
    }

    img {
      max-width: 100%;
      box-sizing: content-box;
      background-color: #fff;
    }

    hr {
      border: none;
      border-bottom: 1px solid #eaecef;
      margin: 24px 0;
      height: 0.25em;
      padding: 0;
      background-color: #e1e4e8;
    }

    ul, ol {
      padding-left: 2em;
      margin-top: 0;
      margin-bottom: 16px;
    }

    li {
      margin: 0.25em 0;
    }

    /* Mermaid diagram styling */
    .mermaid {
      background: white;
      display: flex;
      justify-content: center;
      margin: 1em 0;
      overflow: hidden; /* Changed from auto to hidden for svg-pan-zoom */
      max-width: 100%;
      padding: 1em;
      position: relative; /* For absolute positioning of controls */
      border: 1px solid #e1e4e8;
      border-radius: 6px;
    }
    
    .mermaid-controls {
      position: absolute;
      bottom: 10px;
      right: 10px;
      display: flex;
      gap: 5px;
      background: rgba(255, 255, 255, 0.9);
      padding: 5px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      z-index: 10;
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .mermaid:hover .mermaid-controls {
      opacity: 1;
    }

    .mermaid.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh !important;
      z-index: 1000;
      margin: 0;
      border-radius: 0;
      border: none;
    }
    
    .mermaid-btn {
      background: white;
      border: 1px solid #d1d5da;
      border-radius: 3px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #586069;
      font-size: 16px;
      padding: 0;
    }
    
    .mermaid-btn:hover {
      background-color: #f6f8fa;
      color: #24292e;
    }

    .mermaid-resize-handle {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 10px;
      cursor: ns-resize;
      background: transparent;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .mermaid:hover .mermaid-resize-handle {
      opacity: 1;
    }

    .mermaid-resize-handle::after {
      content: '';
      width: 40px;
      height: 4px;
      background-color: #d1d5da;
      border-radius: 2px;
    }

    .mermaid-resize-handle:hover::after {
      background-color: #0366d6;
    }

    /* Table of Contents Sidebar */
    .toc-sidebar {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 280px;
      max-height: calc(100vh - 100px);
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      z-index: 100;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }

    .toc-sidebar.hidden {
      transform: translateX(320px);
      opacity: 0;
      pointer-events: none;
    }

    .toc-header {
      padding: 1rem;
      background: #f6f8fa;
      border-bottom: 1px solid #e1e4e8;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: #24292e;
    }

    .toc-toggle {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      background: white;
      border: none;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      z-index: 101;
      transition: all 0.2s;
    }

    .toc-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .toc-toggle.active {
      right: 320px;
    }

    .toc-content {
      padding: 1rem;
      overflow-y: auto;
      max-height: calc(100vh - 160px);
    }

    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .toc-list ul {
      list-style: none;
      padding-left: 1rem;
      margin: 0.25rem 0;
    }

    .toc-list li {
      margin: 0.25rem 0;
    }

    .toc-link {
      display: block;
      padding: 0.5rem 0.75rem;
      color: #586069;
      text-decoration: none;
      border-radius: 4px;
      transition: all 0.2s;
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .toc-link:hover {
      background: #f6f8fa;
      color: #0366d6;
    }

    .toc-link.active {
      background: #e3f2fd;
      color: #0366d6;
      font-weight: 600;
    }

    .toc-link[data-level="2"] {
      font-weight: 500;
    }

    /* Manual TOC (inline) */
    .manual-toc {
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 1.5rem;
      margin: 2rem 0;
    }

    .manual-toc::before {
      content: 'Table of Contents';
      display: block;
      font-weight: 600;
      font-size: 1.1em;
      margin-bottom: 1rem;
      color: #24292e;
    }

    .manual-toc .toc-list {
      margin: 0;
    }

    /* Mobile responsive */
    @media (max-width: 1200px) {
      .toc-sidebar {
        width: 260px;
      }

      .toc-toggle.active {
        right: 280px;
      }
    }

    @media (max-width: 768px) {
      .toc-sidebar {
        width: calc(100vw - 40px);
        max-width: 320px;
        right: 20px;
      }

      .toc-toggle.active {
        right: calc(100vw - 20px);
      }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/svg-pan-zoom@3.6.1/dist/svg-pan-zoom.min.js"></script>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    
    mermaid.initialize({
      startOnLoad: false, // We will manually render
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    document.addEventListener('DOMContentLoaded', async () => {
      await mermaid.run();
      
      // Initialize svg-pan-zoom for each diagram
      const diagrams = document.querySelectorAll('.mermaid');
      
      diagrams.forEach((container, index) => {
        const svg = container.querySelector('svg');
        if (!svg) return;
        
        // Ensure unique ID
        if (!svg.id) svg.id = 'mermaid-svg-' + index;
        
        // Set initial styles for SVG to fill container
        svg.style.maxWidth = '100%';
        svg.style.height = '100%'; // Changed to 100% to fill resized container
        container.style.height = '400px'; // Set default initial height
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'mermaid-controls';
        
        const zoomIn = document.createElement('button');
        zoomIn.className = 'mermaid-btn';
        zoomIn.innerHTML = '+';
        zoomIn.title = 'Zoom In';
        
        const zoomOut = document.createElement('button');
        zoomOut.className = 'mermaid-btn';
        zoomOut.innerHTML = '-';
        zoomOut.title = 'Zoom Out';
        
        const reset = document.createElement('button');
        reset.className = 'mermaid-btn';
        reset.innerHTML = '↺';
        reset.title = 'Reset';

        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'mermaid-btn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = 'Toggle Fullscreen';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'mermaid-btn';
        exportBtn.innerHTML = '📷';
        exportBtn.title = 'Export PNG';
        
        controls.appendChild(zoomIn);
        controls.appendChild(zoomOut);
        controls.appendChild(reset);
        controls.appendChild(fullscreenBtn);
        controls.appendChild(exportBtn);
        container.appendChild(controls);

        // Create resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'mermaid-resize-handle';
        container.appendChild(resizeHandle);
        
        // Initialize pan-zoom
        const panZoom = svgPanZoom('#' + svg.id, {
          zoomEnabled: true,
          controlIconsEnabled: false,
          fit: true,
          center: true,
          minZoom: 0.5,
          maxZoom: 10
        });
        
        // Bind events
        zoomIn.addEventListener('click', () => panZoom.zoomIn());
        zoomOut.addEventListener('click', () => panZoom.zoomOut());
        reset.addEventListener('click', () => {
          panZoom.resetZoom();
          panZoom.center();
        });

        let savedHeight = '';
        const toggleFullscreen = () => {
          const isFullscreen = container.classList.contains('fullscreen');
          if (isFullscreen) {
            container.classList.remove('fullscreen');
            container.style.height = savedHeight;
            fullscreenBtn.innerHTML = '⛶';
            fullscreenBtn.title = 'Toggle Fullscreen';
          } else {
            savedHeight = container.style.height;
            container.classList.add('fullscreen');
            fullscreenBtn.innerHTML = '✖';
            fullscreenBtn.title = 'Exit Fullscreen';
          }
          // Wait for transition/render then resize
          setTimeout(() => {
             panZoom.resize();
             panZoom.fit();
             panZoom.center();
          }, 50);
        };

        fullscreenBtn.addEventListener('click', toggleFullscreen);

        const exportPng = () => {
          const svgData = new XMLSerializer().serializeToString(svg);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          // Get real size of the SVG
          const svgSize = svg.getBoundingClientRect();
          // Use viewBox if available for better resolution, otherwise fallback to client size
          const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number);
          const width = viewBox ? viewBox[2] : svgSize.width;
          const height = viewBox ? viewBox[3] : svgSize.height;
          
          // Scale up for better quality
          const scale = 2;
          canvas.width = width * scale;
          canvas.height = height * scale;
          
          img.onload = () => {
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const pngUrl = canvas.toDataURL('image/png');
                const downloadLink = document.createElement('a');
                downloadLink.href = pngUrl;
                downloadLink.download = \`mermaid-diagram-\${index}.png\`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
          };
          
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        };

        exportBtn.addEventListener('click', exportPng);

        // Exit fullscreen on Escape key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && container.classList.contains('fullscreen')) {
            toggleFullscreen();
          }
        });
        
        // Resize logic
        let isResizing = false;
        let startY;
        let startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
          isResizing = true;
          startY = e.clientY;
          startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10);
          document.documentElement.style.cursor = 'ns-resize';
          e.preventDefault(); // Prevent text selection
        });

        document.addEventListener('mousemove', (e) => {
          if (!isResizing) return;
          const newHeight = startHeight + (e.clientY - startY);
          if (newHeight > 100) { // Minimum height
            container.style.height = newHeight + 'px';
            panZoom.resize();
            panZoom.fit();
            panZoom.center();
          }
        });

        document.addEventListener('mouseup', () => {
          if (isResizing) {
            isResizing = false;
            document.documentElement.style.cursor = 'default';
          }
        });
        
        // Fix for initial sizing issues
        setTimeout(() => {
          panZoom.resize();
          panZoom.fit();
          panZoom.center();
        }, 100);
      });
    });
  </script>
</head>
<body>
  ${tocHtml ? `
  <!-- TOC Toggle Button -->
  <button class="toc-toggle" id="toc-toggle" title="Toggle Table of Contents">
    ☰
  </button>

  <!-- TOC Sidebar -->
  <aside class="toc-sidebar hidden" id="toc-sidebar">
    <div class="toc-header">
      <span>Contents</span>
    </div>
    <div class="toc-content">
      ${tocHtml}
    </div>
  </aside>

  <script>
    // TOC functionality
    (function() {
      const tocToggle = document.getElementById('toc-toggle');
      const tocSidebar = document.getElementById('toc-sidebar');
      const tocLinks = document.querySelectorAll('.toc-link');

      if (!tocToggle || !tocSidebar || tocLinks.length === 0) return;

      // Load TOC state from localStorage
      const tocVisible = localStorage.getItem('toc-visible') === 'true';
      if (tocVisible) {
        tocSidebar.classList.remove('hidden');
        tocToggle.classList.add('active');
      }

      // Toggle TOC
      tocToggle.addEventListener('click', () => {
        const isHidden = tocSidebar.classList.contains('hidden');
        if (isHidden) {
          tocSidebar.classList.remove('hidden');
          tocToggle.classList.add('active');
          localStorage.setItem('toc-visible', 'true');
        } else {
          tocSidebar.classList.add('hidden');
          tocToggle.classList.remove('active');
          localStorage.setItem('toc-visible', 'false');
        }
      });

      // Smooth scroll to section
      tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL without jumping
            history.pushState(null, '', '#' + targetId);
          }
        });
      });

      // Highlight active section on scroll
      let ticking = false;
      function updateActiveToc() {
        const headings = Array.from(document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'));
        const scrollPosition = window.scrollY + 100; // Offset for better UX

        let activeHeading = null;
        for (const heading of headings) {
          if (heading.offsetTop <= scrollPosition) {
            activeHeading = heading;
          } else {
            break;
          }
        }

        // Remove all active classes
        tocLinks.forEach(link => link.classList.remove('active'));

        // Add active class to current section
        if (activeHeading) {
          const activeLink = document.querySelector('.toc-link[href="#' + activeHeading.id + '"]');
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }

        ticking = false;
      }

      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateActiveToc();
          });
          ticking = true;
        }
      });

      // Initial update
      updateActiveToc();
    })();
  </script>
  ` : ''}

  ${watchEnabled ? `
  <script>
    // Live Reload Client
    (function() {
      const currentPath = window.location.pathname;
      let eventSource = null;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;
      const baseDelay = 1000; // 1 second

      function connect() {
        if (eventSource) {
          eventSource.close();
        }

        const url = '/api/live-reload?file=' + encodeURIComponent(currentPath);
        console.log('[LiveReload] Connecting to:', url);

        eventSource = new EventSource(url);

        eventSource.addEventListener('open', () => {
          console.log('[LiveReload] Connected');
          reconnectAttempts = 0;
        });

        eventSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[LiveReload] Received:', data);

            if (data.type === 'change') {
              console.log('[LiveReload] File changed, reloading...');
              window.location.reload();
            } else if (data.type === 'deleted') {
              console.log('[LiveReload] File deleted');
              alert('The file has been deleted.');
            } else if (data.type === 'error') {
              console.error('[LiveReload] Server error:', data.message);
            }
          } catch (error) {
            console.error('[LiveReload] Error parsing message:', error);
          }
        });

        eventSource.addEventListener('error', (error) => {
          console.error('[LiveReload] Connection error:', error);
          eventSource.close();

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            console.log(\`[LiveReload] Reconnecting in \${delay}ms (attempt \${reconnectAttempts}/\${maxReconnectAttempts})...\`);
            setTimeout(connect, delay);
          } else {
            console.error('[LiveReload] Max reconnection attempts reached. Please refresh the page.');
          }
        });
      }

      // Start connection
      connect();

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (eventSource) {
          eventSource.close();
        }
      });
    })();
  </script>
  ` : ''}

  <div class="markdown-body">
    ${content}
  </div>
</body>
</html>
  `.trim();
}

/**
 * HTML template for directory listing
 */
export function getDirectoryTemplate(path: string, files: Array<{ name: string; isDirectory: boolean; path: string }>): string {
  const fileList = files
    .map(file => {
      const icon = file.isDirectory ? '📁' : (file.name.endsWith('.md') ? '📄' : '📎');
      return `<li><a href="${escapeHtml(file.path)}">${icon} ${escapeHtml(file.name)}</a></li>`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Index of ${escapeHtml(path)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }

    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h1 {
      border-bottom: 2px solid #eaecef;
      padding-bottom: 0.5em;
      margin-bottom: 1em;
    }

    ul {
      list-style: none;
      padding: 0;
    }

    li {
      padding: 0.5em 0;
    }

    a {
      color: #0366d6;
      text-decoration: none;
      font-size: 1.1em;
    }

    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Index of ${escapeHtml(path)}</h1>
    <ul>
      ${fileList}
    </ul>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * T024: Error page template for authentication failures
 */
const AUTH_ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  AUTH_DENIED: {
    title: 'Access Denied',
    message: 'You denied access to your Google account. Authentication is required to view this content.',
  },
  AUTH_FAILED: {
    title: 'Authentication Failed',
    message: 'Something went wrong during authentication. Please try again.',
  },
  DOMAIN_BLOCKED: {
    title: 'Domain Not Allowed',
    message: 'Your email domain is not authorized to access this content.',
  },
  STATE_MISMATCH: {
    title: 'Invalid Request',
    message: 'The authentication request was invalid or expired. Please try logging in again.',
  },
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
  },
};

export function getAuthErrorTemplate(errorCode: string): string {
  const errorInfo = AUTH_ERROR_MESSAGES[errorCode] || {
    title: 'Authentication Error',
    message: 'An error occurred during authentication.',
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(errorInfo.title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #24292e;
      max-width: 600px;
      margin: 100px auto;
      padding: 2rem;
      text-align: center;
    }

    .error-container {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      color: #d73a49;
      margin-bottom: 1rem;
    }

    p {
      color: #586069;
      margin-bottom: 2rem;
    }

    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #0366d6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }

    .btn:hover {
      background: #0256b9;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">🔒</div>
    <h1>${escapeHtml(errorInfo.title)}</h1>
    <p>${escapeHtml(errorInfo.message)}</p>
    <a href="/__auth/login" class="btn">Try Again</a>
  </div>
</body>
</html>
  `.trim();
}

/**
 * T031: Logout confirmation page template
 */
export function getLogoutTemplate(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logged Out</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #24292e;
      max-width: 600px;
      margin: 100px auto;
      padding: 2rem;
      text-align: center;
    }

    .logout-container {
      background: white;
      padding: 3rem;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .logout-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      color: #28a745;
      margin-bottom: 1rem;
    }

    p {
      color: #586069;
      margin-bottom: 2rem;
    }

    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #0366d6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
    }

    .btn:hover {
      background: #0256b9;
    }
  </style>
</head>
<body>
  <div class="logout-container">
    <div class="logout-icon">👋</div>
    <h1>You have been logged out</h1>
    <p>You have successfully signed out. To access protected content, you'll need to log in again.</p>
    <a href="/__auth/login" class="btn">Log in again</a>
  </div>
</body>
</html>
  `.trim();
}
