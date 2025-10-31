/**
 * @fileoverview File-based job queue service for managing background tasks.
 * @module src/services/jobQueue
 */

import { existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { BaseErrorCode, McpError } from '../types-global/errors.js';
import { JobData, JobDataSchema, JobStatus, ConversationStatus, ConversationStatusSchema } from '../types-global/job-status.js';
import { logger } from '../utils/index.js';

/**
 * Job Queue Service - Manages file-based job queue operations
 */
class JobQueueService {
  /**
   * Gets the base directory for conversation logs (where jobs are stored)
   */
  private getBaseDir(): string {
    if (!config.conversationLogsPath) {
      throw new McpError(
        BaseErrorCode.CONFIGURATION_ERROR,
        'Conversation logs directory is not configured.'
      );
    }
    return config.conversationLogsPath;
  }

  /**
   * Gets the path to a conversation's job file
   */
  private getJobFilePath(conversationId: string): string {
    return path.join(this.getBaseDir(), conversationId, 'job.json');
  }

  /**
   * Gets the path to a conversation's status file
   */
  private getStatusFilePath(conversationId: string): string {
    return path.join(this.getBaseDir(), conversationId, 'status.json');
  }

  /**
   * Enqueues a new job to the queue
   * @param jobData - The job data to enqueue
   * @returns The conversation ID (job ID)
   */
  enqueueJob(jobData: JobData): string {
    try {
      const jobFilePath = this.getJobFilePath(jobData.conversationId);
      
      // Validate job data
      const validatedJob = JobDataSchema.parse(jobData);
      
      // Write job file atomically
      const tempPath = `${jobFilePath}.tmp`;
      writeFileSync(tempPath, JSON.stringify(validatedJob, null, 2), 'utf-8');
      
      // Atomic rename
      if (existsSync(jobFilePath)) {
        unlinkSync(jobFilePath);
      }
      writeFileSync(jobFilePath, JSON.stringify(validatedJob, null, 2), 'utf-8');
      
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }

      logger.info(`Job enqueued successfully: ${jobData.conversationId}`);

      return jobData.conversationId;
    } catch (error) {
      logger.error(`Failed to enqueue job ${jobData.conversationId}: ${error instanceof Error ? error.message : String(error)}`);
      throw new McpError(
        BaseErrorCode.FILESYSTEM_ERROR,
        `Failed to enqueue job: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Dequeues the next pending job from the queue
   * @returns The next job data or null if no jobs available
   */
  dequeueJob(): JobData | null {
    try {
      const baseDir = this.getBaseDir();
      if (!existsSync(baseDir)) {
        return null;
      }

      const conversations = readdirSync(baseDir);
      let highestPriorityJob: { job: JobData; conversationId: string } | null = null;

      // First pass: find highest priority pending job
      for (const conversationId of conversations) {
        const jobFilePath = this.getJobFilePath(conversationId);
        const statusFilePath = this.getStatusFilePath(conversationId);

        if (!existsSync(jobFilePath) || !existsSync(statusFilePath)) {
          continue;
        }

        try {
          const statusContent = readFileSync(statusFilePath, 'utf-8');
          const status = ConversationStatusSchema.parse(JSON.parse(statusContent));

          // Only process pending jobs
          if (status.status !== JobStatus.PENDING) {
            continue;
          }

          const jobContent = readFileSync(jobFilePath, 'utf-8');
          const job = JobDataSchema.parse(JSON.parse(jobContent));

          // Select highest priority job
          if (!highestPriorityJob || job.priority > highestPriorityJob.job.priority) {
            highestPriorityJob = { job, conversationId };
          }
        } catch (parseError) {
          logger.warning(`Failed to parse job or status file for ${conversationId}, skipping: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          continue;
        }
      }

      // Second pass: atomically claim the job by updating status
      if (highestPriorityJob) {
        try {
          const statusFilePath = this.getStatusFilePath(highestPriorityJob.conversationId);
          
          // Re-read status to ensure it's still pending (double-check)
          const statusContent = readFileSync(statusFilePath, 'utf-8');
          const status = ConversationStatusSchema.parse(JSON.parse(statusContent));
          
          // Race condition check: if status changed, someone else claimed it
          if (status.status !== JobStatus.PENDING) {
            logger.debug(`Job ${highestPriorityJob.conversationId} was claimed by another worker`);
            return null;
          }
          
          // Atomically update status to IN_PROGRESS
          status.status = JobStatus.IN_PROGRESS;
          status.updatedAt = new Date().toISOString();
          
          // Write to temp file first, then atomically rename
          const tempPath = `${statusFilePath}.tmp.${Date.now()}.${process.pid}`;
          writeFileSync(tempPath, JSON.stringify(status, null, 2), 'utf-8');
          
          // Atomic rename - if this fails, another process won the race
          renameSync(tempPath, statusFilePath);
          
          logger.info(`Job dequeued: ${highestPriorityJob.conversationId} (${highestPriorityJob.job.toolName}, priority: ${highestPriorityJob.job.priority})`);
          
          return highestPriorityJob.job;
        } catch (claimError) {
          // Failed to claim job (likely race condition) - another worker got it
          logger.debug(`Failed to claim job ${highestPriorityJob.conversationId}: ${claimError instanceof Error ? claimError.message : String(claimError)}`);
          return null;
        }
      }

      return null;
    } catch (error) {
      logger.error(`Failed to dequeue job: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Updates the status of a job
   * @param conversationId - The conversation/job ID
   * @param status - The updated status
   */
  updateJobStatus(conversationId: string, status: ConversationStatus): void {
    try {
      const statusFilePath = this.getStatusFilePath(conversationId);
      
      // Validate status
      const validatedStatus = ConversationStatusSchema.parse(status);
      
      // Write to temp file first, then atomically rename
      const tempPath = `${statusFilePath}.tmp.${Date.now()}.${process.pid}`;
      writeFileSync(tempPath, JSON.stringify(validatedStatus, null, 2), 'utf-8');
      
      // Atomic rename (overwrites existing file atomically on POSIX systems)
      renameSync(tempPath, statusFilePath);

      logger.debug(`Job status updated: ${conversationId} -> ${status.status}`);
    } catch (error) {
      logger.error(`Failed to update job status for ${conversationId}: ${error instanceof Error ? error.message : String(error)}`);
      throw new McpError(
        BaseErrorCode.FILESYSTEM_ERROR,
        `Failed to update job status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Gets the status of a job
   * @param conversationId - The conversation/job ID
   * @returns The job status or null if not found
   */
  getJobStatus(conversationId: string): ConversationStatus | null {
    try {
      const statusFilePath = this.getStatusFilePath(conversationId);
      
      if (!existsSync(statusFilePath)) {
        return null;
      }

      const statusContent = readFileSync(statusFilePath, 'utf-8');
      const status = ConversationStatusSchema.parse(JSON.parse(statusContent));
      
      return status;
    } catch (error) {
      logger.error(`Failed to get job status for ${conversationId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Lists all active jobs (pending or in_progress)
   * @returns Array of conversation IDs with active jobs
   */
  listActiveJobs(): string[] {
    try {
      const baseDir = this.getBaseDir();
      if (!existsSync(baseDir)) {
        return [];
      }

      const conversations = readdirSync(baseDir);
      const activeJobs: string[] = [];

      for (const conversationId of conversations) {
        const status = this.getJobStatus(conversationId);
        
        if (status && (status.status === JobStatus.PENDING || status.status === JobStatus.IN_PROGRESS)) {
          activeJobs.push(conversationId);
        }
      }

      return activeJobs;
    } catch (error) {
      logger.error(`Failed to list active jobs: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Recovers stalled jobs that were in_progress but interrupted
   * (e.g., due to server restart)
   * @param stalledThresholdMs - Time in ms before considering a job stalled (default: 10 minutes)
   * @returns Number of jobs recovered
   */
  recoverStalledJobs(stalledThresholdMs: number = 600000): number {
    try {
      const baseDir = this.getBaseDir();
      if (!existsSync(baseDir)) {
        return 0;
      }

      const conversations = readdirSync(baseDir);
      let recoveredCount = 0;
      const now = Date.now();

      for (const conversationId of conversations) {
        const status = this.getJobStatus(conversationId);
        
        if (!status || status.status !== JobStatus.IN_PROGRESS) {
          continue;
        }

        const updatedAt = new Date(status.updatedAt).getTime();
        const elapsedSinceUpdate = now - updatedAt;

        // If job hasn't been updated in a while, consider it stalled
        if (elapsedSinceUpdate > stalledThresholdMs) {
          logger.warning(`Recovering stalled job ${conversationId} (elapsed: ${Math.floor(elapsedSinceUpdate / 60000)} minutes)`);

          // Reset status to pending so it can be retried
          const updatedStatus: ConversationStatus = {
            ...status,
            status: JobStatus.PENDING,
            updatedAt: new Date().toISOString(),
          };

          this.updateJobStatus(conversationId, updatedStatus);
          recoveredCount++;
        }
      }

      if (recoveredCount > 0) {
        logger.info(`Recovered ${recoveredCount} stalled job(s)`);
      }

      return recoveredCount;
    } catch (error) {
      logger.error(`Failed to recover stalled jobs: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * Removes a job from the queue (deletes job.json)
   * @param conversationId - The conversation/job ID
   */
  removeJob(conversationId: string): void {
    try {
      const jobFilePath = this.getJobFilePath(conversationId);
      
      if (existsSync(jobFilePath)) {
        unlinkSync(jobFilePath);
        logger.debug(`Job file removed: ${conversationId}`);
      }
    } catch (error) {
      logger.error(`Failed to remove job file for ${conversationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}



export const jobQueueService = new JobQueueService();

