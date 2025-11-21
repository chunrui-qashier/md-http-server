import chokidar, { FSWatcher } from 'chokidar';
import { Response } from 'express';
import * as path from 'path';

export interface WatcherClient {
  id: string;
  filePath: string;
  res: Response;
  lastUpdate: number;
}

export class FileWatcherManager {
  private watchers: Map<string, FSWatcher>;
  private clients: Map<string, Set<WatcherClient>>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private debounceDelay: number;

  constructor(debounceDelay: number = 500) {
    this.watchers = new Map();
    this.clients = new Map();
    this.debounceTimers = new Map();
    this.debounceDelay = debounceDelay;
  }

  /**
   * Watch a file and register a client for notifications
   */
  watchFile(filePath: string, client: WatcherClient): void {
    const absolutePath = path.resolve(filePath);

    // Add client to the set for this file
    if (!this.clients.has(absolutePath)) {
      this.clients.set(absolutePath, new Set());
    }
    this.clients.get(absolutePath)!.add(client);

    // Create watcher if it doesn't exist
    if (!this.watchers.has(absolutePath)) {
      const watcher = chokidar.watch(absolutePath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100,
        },
      });

      watcher.on('change', () => {
        this.handleFileChange(absolutePath);
      });

      watcher.on('unlink', () => {
        this.notifyClients(absolutePath, { type: 'deleted' });
        this.stopWatching(absolutePath);
      });

      watcher.on('error', (error) => {
        console.error(`Watcher error for ${absolutePath}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        this.notifyClients(absolutePath, { type: 'error', message });
      });

      this.watchers.set(absolutePath, watcher);
      console.log(`[FileWatcher] Started watching: ${absolutePath}`);
    }
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(filePath: string): void {
    // Clear existing timer
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.notifyClients(filePath, { type: 'change' });
      this.debounceTimers.delete(filePath);
    }, this.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Notify all clients watching a specific file
   */
  private notifyClients(filePath: string, data: any): void {
    const clients = this.clients.get(filePath);
    if (!clients) return;

    const message = `data: ${JSON.stringify({ ...data, filePath, timestamp: Date.now() })}\n\n`;

    clients.forEach((client) => {
      try {
        if (!client.res.writableEnded) {
          client.res.write(message);
          client.lastUpdate = Date.now();
        } else {
          // Remove dead client
          clients.delete(client);
        }
      } catch (error) {
        console.error(`[FileWatcher] Error notifying client ${client.id}:`, error);
        clients.delete(client);
      }
    });

    console.log(`[FileWatcher] Notified ${clients.size} clients for ${filePath}`);
  }

  /**
   * Unwatch a file for a specific client
   */
  unwatchFile(clientId: string): void {
    // Find and remove the client
    for (const [filePath, clients] of this.clients.entries()) {
      for (const client of clients) {
        if (client.id === clientId) {
          clients.delete(client);
          console.log(`[FileWatcher] Client ${clientId} unwatched ${filePath}`);

          // If no more clients, stop watching
          if (clients.size === 0) {
            this.stopWatching(filePath);
          }
          return;
        }
      }
    }
  }

  /**
   * Stop watching a file
   */
  private stopWatching(filePath: string): void {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      console.log(`[FileWatcher] Stopped watching: ${filePath}`);
    }

    this.clients.delete(filePath);

    // Clear debounce timer
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath)!);
      this.debounceTimers.delete(filePath);
    }
  }

  /**
   * Get statistics about active watchers
   */
  getStats(): { watchedFiles: number; totalClients: number } {
    let totalClients = 0;
    for (const clients of this.clients.values()) {
      totalClients += clients.size;
    }

    return {
      watchedFiles: this.watchers.size,
      totalClients,
    };
  }

  /**
   * Clean up all watchers and clients
   */
  cleanup(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const [filePath, watcher] of this.watchers.entries()) {
      watcher.close();
      console.log(`[FileWatcher] Cleanup: Stopped watching ${filePath}`);
    }
    this.watchers.clear();

    // Clear all clients
    this.clients.clear();

    console.log('[FileWatcher] Cleanup complete');
  }
}
