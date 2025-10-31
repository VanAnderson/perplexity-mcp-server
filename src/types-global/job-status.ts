/**
 * @fileoverview Types and schemas for background job processing and status tracking.
 * @module src/types-global/job-status
 */

import { z } from 'zod';

/**
 * Job status enumeration
 */
export const JobStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

/**
 * Schema for job status values
 */
export const JobStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
]);

/**
 * Progress information for a job
 */
export const ProgressInfoSchema = z.object({
  message: z.string().describe('Human-readable progress message'),
  percentage: z.number().min(0).max(100).optional().describe('Progress percentage (0-100)'),
  elapsedMs: z.number().int().nonnegative().describe('Elapsed time in milliseconds'),
  estimatedRemainingMs: z.number().int().nonnegative().optional().describe('Estimated remaining time in milliseconds'),
});

export type ProgressInfo = z.infer<typeof ProgressInfoSchema>;

/**
 * Error information for failed jobs
 */
export const JobErrorSchema = z.object({
  code: z.string().describe('Error code'),
  message: z.string().describe('Error message'),
  details: z.record(z.any()).optional().describe('Additional error details'),
  stackTrace: z.string().optional().describe('Stack trace if available'),
});

export type JobError = z.infer<typeof JobErrorSchema>;

/**
 * Conversation status schema - tracks the status of a conversation/job
 */
export const ConversationStatusSchema = z.object({
  conversationId: z.string().describe('Unique conversation identifier'),
  status: JobStatusSchema.describe('Current job status'),
  toolName: z.string().describe('Name of the tool that created this job'),
  startedAt: z.string().datetime().describe('ISO 8601 timestamp when job started'),
  updatedAt: z.string().datetime().describe('ISO 8601 timestamp of last update'),
  completedAt: z.string().datetime().optional().describe('ISO 8601 timestamp when job completed'),
  progress: ProgressInfoSchema.optional().describe('Progress information if job is in progress'),
  error: JobErrorSchema.optional().describe('Error information if job failed'),
  metadata: z.record(z.any()).optional().describe('Additional metadata for the job'),
});

export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

/**
 * Job data schema - represents a queued job
 */
export const JobDataSchema = z.object({
  conversationId: z.string().describe('Conversation ID associated with this job'),
  toolName: z.string().describe('Name of the tool to execute'),
  params: z.record(z.any()).describe('Parameters to pass to the tool'),
  createdAt: z.string().datetime().describe('ISO 8601 timestamp when job was created'),
  attempts: z.number().int().nonnegative().default(0).describe('Number of execution attempts'),
  maxAttempts: z.number().int().positive().default(3).describe('Maximum number of retry attempts'),
  priority: z.number().int().default(0).describe('Job priority (higher = more important)'),
});

export type JobData = z.infer<typeof JobDataSchema>;

/**
 * Tool configuration for async execution (modular for future expansion)
 */
export const ToolConfigSchema = z.object({
  toolName: z.string().describe('Name of the tool'),
  enableAsync: z.boolean().default(false).describe('Whether async mode is enabled for this tool'),
  maxConcurrentJobs: z.number().int().positive().default(5).describe('Maximum concurrent jobs for this tool'),
  defaultTimeout: z.number().int().positive().default(600000).describe('Default timeout in milliseconds'),
  retryable: z.boolean().default(true).describe('Whether failed jobs should be retried'),
});

export type ToolConfig = z.infer<typeof ToolConfigSchema>;

/**
 * Helper function to create initial conversation status
 */
export function createInitialStatus(
  conversationId: string,
  toolName: string,
  metadata?: Record<string, any>
): ConversationStatus {
  const now = new Date().toISOString();
  return {
    conversationId,
    status: JobStatus.PENDING,
    toolName,
    startedAt: now,
    updatedAt: now,
    metadata,
  };
}

/**
 * Helper function to update status with progress
 */
export function updateStatusWithProgress(
  status: ConversationStatus,
  progressMessage: string,
  percentage?: number
): ConversationStatus {
  const now = new Date().toISOString();
  const startTime = new Date(status.startedAt).getTime();
  const currentTime = new Date(now).getTime();
  const elapsedMs = currentTime - startTime;

  return {
    ...status,
    status: JobStatus.IN_PROGRESS,
    updatedAt: now,
    progress: {
      message: progressMessage,
      percentage,
      elapsedMs,
    },
  };
}

/**
 * Helper function to mark status as completed
 */
export function markStatusCompleted(status: ConversationStatus): ConversationStatus {
  const now = new Date().toISOString();
  return {
    ...status,
    status: JobStatus.COMPLETED,
    updatedAt: now,
    completedAt: now,
  };
}

/**
 * Helper function to mark status as failed
 */
export function markStatusFailed(
  status: ConversationStatus,
  error: JobError
): ConversationStatus {
  const now = new Date().toISOString();
  return {
    ...status,
    status: JobStatus.FAILED,
    updatedAt: now,
    completedAt: now,
    error,
  };
}

