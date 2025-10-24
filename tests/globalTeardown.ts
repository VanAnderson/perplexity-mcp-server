/**
 * Global test teardown file
 * Runs once after all tests complete
 */

import { existsSync, rmSync } from 'fs';
import path from 'path';

export default async (): Promise<void> => {
  const projectRoot = process.cwd();
  const testConversationLogsDir = path.join(projectRoot, 'test-conversation-logs');

  // Clean up entire test-conversation-logs directory
  if (existsSync(testConversationLogsDir)) {
    try {
      console.log('[Test Cleanup] Removing test-conversation-logs directory');
      rmSync(testConversationLogsDir, { recursive: true, force: true });
      console.log('[Test Cleanup] Successfully removed test-conversation-logs directory');
    } catch (error) {
      console.error('[Test Cleanup] Error cleaning up test-conversation-logs:', error);
    }
  } else {
    console.log('[Test Cleanup] No test-conversation-logs directory to clean up');
  }
};