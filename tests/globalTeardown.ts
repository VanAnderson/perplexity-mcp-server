/**
 * Global test teardown file
 * Runs once after all tests complete
 */

import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import path from 'path';

export default async (): Promise<void> => {
  const projectRoot = process.cwd();
  const conversationLogsDir = path.join(projectRoot, 'conversation-logs');

  // Clean up any test-generated conversation logs
  // Only remove directories created during test runs (indicated by timestamps from today)
  if (existsSync(conversationLogsDir)) {
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // Format: YYYYMMDD
      const entries = readdirSync(conversationLogsDir);

      for (const entry of entries) {
        const entryPath = path.join(conversationLogsDir, entry);
        const stats = statSync(entryPath);

        // If it's a directory and starts with today's date (format: YYYYMMDD-timestamp)
        if (stats.isDirectory() && entry.startsWith(today)) {
          // Additional check: only remove if created within last hour (likely from test run)
          const createdTime = stats.birthtimeMs || stats.ctimeMs;
          const oneHourAgo = Date.now() - (60 * 60 * 1000);

          if (createdTime > oneHourAgo) {
            console.log(`[Test Cleanup] Removing test-generated conversation: ${entry}`);
            rmSync(entryPath, { recursive: true, force: true });
          }
        }
      }
    } catch (error) {
      console.error('[Test Cleanup] Error cleaning up conversation logs:', error);
    }
  }

  // Clean up test-conversation-logs directory if it exists
  const testLogsDir = path.join(projectRoot, 'test-conversation-logs');
  if (existsSync(testLogsDir)) {
    try {
      console.log('[Test Cleanup] Removing test-conversation-logs directory');
      rmSync(testLogsDir, { recursive: true, force: true });
    } catch (error) {
      console.error('[Test Cleanup] Error cleaning up test-conversation-logs:', error);
    }
  }
};