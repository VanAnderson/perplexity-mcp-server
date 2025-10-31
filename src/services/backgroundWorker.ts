/**
 * @fileoverview Background worker service for processing asynchronous jobs.
 * @module src/services/backgroundWorker
 */

import { config } from '../config/index.js';
import { BaseErrorCode, McpError } from '../types-global/errors.js';
import {
  JobStatus,
  JobData,
  updateStatusWithProgress,
  markStatusCompleted,
  markStatusFailed,
  markStatusForRetry,
  incrementAttempts,
  type JobError,
} from '../types-global/job-status.js';
import { logger, requestContextService } from '../utils/index.js';
import { conversationPersistenceService } from './conversationPersistence.js';
import { jobQueueService } from './jobQueue.js';
import { perplexityApiService } from './perplexityApi.js';

/**
 * Background Worker Service - Processes jobs asynchronously
 */
class BackgroundWorkerService {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 2000; // Check for new jobs every 2 seconds
  private readonly MAX_CONCURRENT_JOBS = 5;
  private activeJobCount: number = 0;

  /**
   * Starts the background worker
   */
  startWorker(): void {
    if (this.isRunning) {
      logger.warning('Background worker is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting background worker for async job processing');

    // Recover any stalled jobs from previous runs
    jobQueueService.recoverStalledJobs();

    // Start processing loop
    this.processingInterval = setInterval(() => {
      this.processNextJob().catch((error) => {
        logger.error(`Error in background worker loop: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, this.POLL_INTERVAL_MS);

    logger.info('Background worker started successfully');
  }

  /**
   * Stops the background worker
   */
  stopWorker(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info('Background worker stopped');
  }

  /**
   * Processes the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    // Check if we have capacity for more jobs
    if (this.activeJobCount >= this.MAX_CONCURRENT_JOBS) {
      logger.debug('Max concurrent jobs reached, waiting for capacity');
      return;
    }

    // Dequeue next job
    const job = jobQueueService.dequeueJob();
    
    if (!job) {
      // No jobs available
      return;
    }

    // Process the job
    this.activeJobCount++;
    
    try {
      await this.executeJob(job);
    } catch (error) {
      logger.error(`Error executing job ${job.conversationId} (${job.toolName}): ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.activeJobCount--;
    }
  }

  /**
   * Executes a job based on its tool name
   */
  private async executeJob(job: JobData): Promise<void> {
    const context = requestContextService.createRequestContext({
      toolName: job.toolName,
      conversationId: job.conversationId,
    });

    logger.info('Executing job', {
      ...context,
      conversationId: job.conversationId,
      toolName: job.toolName,
      attempt: job.attempts + 1,
    });

    // Route to appropriate handler
    switch (job.toolName) {
      case 'perplexity_deep_research':
        await this.executeDeepResearchJob(job);
        break;
      case 'perplexity_deep_research_followup':
        await this.executeDeepResearchFollowupJob(job);
        break;
      default:
        logger.error('Unknown tool name for job', {
          ...context,
          toolName: job.toolName,
        });
        
        // Mark as failed
        const status = jobQueueService.getJobStatus(job.conversationId);
        if (status) {
          const failedStatus = markStatusFailed(status, {
            code: 'UNKNOWN_TOOL',
            message: `Unknown tool name: ${job.toolName}`,
          });
          jobQueueService.updateJobStatus(job.conversationId, failedStatus);
        }
        
        // Remove job from queue
        jobQueueService.removeJob(job.conversationId);
    }
  }

  /**
   * Executes a deep research job with incremental streaming
   */
  private async executeDeepResearchJob(job: JobData): Promise<void> {
    const context = requestContextService.createRequestContext({
      toolName: job.toolName,
      conversationId: job.conversationId,
    });

    const { query, reasoning_effort } = job.params;
    const systemPrompt = `You are an expert-level AI research assistant using the Perplexity deep research engine. Your primary directive is to conduct exhaustive, multi-source research and generate detailed, well-structured, and impeccably cited reports suitable for an expert audience.

**Core Directives:**

1.  **Systematic & Exhaustive Research:** Conduct a comprehensive, multi-faceted search to build a deep and nuanced understanding of the topic. Synthesize information from a wide array of sources to ensure the final report is complete.
2.  **Source Vetting:** Apply rigorous standards to source evaluation. Prioritize primary sources, peer-reviewed literature, and authoritative contemporary reports. Scrutinize sources for bias and accuracy.
3.  **Accurate & Robust Citations:** Every piece of information, data point, or claim must be attributed with a precise, inline citation. Ensure all citation metadata (URL, title) is captured correctly and completely.

**Final Report Formatting Rules:**

1.  **Synthesize and Structure:** Your answer must be a comprehensive synthesis of the information gathered. Structure the response logically with clear headings, subheadings, and paragraphs to create a professional-grade document.
2.  **Depth and Detail:** Provide a thorough and detailed analysis. Avoid superficiality and demonstrate a deep command of the subject matter.
3.  **Clarity and Precision:** Use clear, precise, and professional language.
4.  **Stand-Alone Report:** The final answer must be a complete, stand-alone report, ready for publication. Do not include conversational filler or meta-commentary on your research process.`;

    try {
      // Get current status
      let status = jobQueueService.getJobStatus(job.conversationId);
      if (!status) {
        throw new Error('Job status not found');
      }

      // Update status to in_progress
      status = updateStatusWithProgress(status, 'Starting deep research query...', 0);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Prepare API request
      const requestPayload = {
        model: 'sonar-deep-research' as const,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: query },
        ],
        stream: false,
        reasoning_effort: reasoning_effort || config.perplexityDefaultEffort,
      };

      logger.info('Calling Perplexity API for deep research', { ...context });

      // Update progress
      status = updateStatusWithProgress(status, 'Querying Perplexity API...', 25);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Make API call
      const response = await perplexityApiService.chatCompletion(requestPayload, context);

      const rawResultText = response.choices?.[0]?.message?.content;
      
      if (!rawResultText) {
        throw new McpError(
          BaseErrorCode.SERVICE_UNAVAILABLE,
          'Perplexity API returned an empty response.',
          { responseId: response.id }
        );
      }

      // Update progress
      status = updateStatusWithProgress(status, 'Received response, saving results...', 75);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Append the assistant's response to the conversation
      await conversationPersistenceService.appendToConversation(
        job.conversationId,
        { role: 'assistant', content: rawResultText },
        context,
        false
      );

      // Update progress
      status = updateStatusWithProgress(status, 'Finalizing...', 90);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Mark as completed
      status = markStatusCompleted(status);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Remove job from queue
      jobQueueService.removeJob(job.conversationId);

      logger.info('Deep research job completed successfully', {
        ...context,
        conversationId: job.conversationId,
        responseId: response.id,
        model: response.model,
      });

    } catch (error) {
      logger.error('Deep research job failed', {
        ...context,
        conversationId: job.conversationId,
        error: error instanceof Error ? error.message : String(error),
        attempt: job.attempts + 1,
      });

      // Get current status
      let status = jobQueueService.getJobStatus(job.conversationId);
      if (status) {
        // Create error object
        const jobError: JobError = {
          code: error instanceof McpError ? error.code : BaseErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof McpError ? error.details : {},
          stackTrace: error instanceof Error ? error.stack : undefined,
        };

        // Check if we should retry
        const maxRetries = config.perplexityMaxJobRetries;
        const currentAttempt = status.attempts || 0;
        
        if (currentAttempt < maxRetries) {
          // Retry: mark for retry and re-enqueue
          logger.info(`Retrying job ${job.conversationId} (attempt ${currentAttempt + 1} of ${maxRetries})`, {
            ...context,
            conversationId: job.conversationId,
            currentAttempt,
            maxRetries,
          });
          
          status = markStatusForRetry(status, jobError);
          jobQueueService.updateJobStatus(job.conversationId, status);
          conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);
          
          // Job will be picked up again by the worker since status is PENDING
        } else {
          // Max retries exceeded: mark as permanently failed
          logger.error(`Job ${job.conversationId} failed after ${currentAttempt} attempts`, {
            ...context,
            conversationId: job.conversationId,
            maxRetries,
          });
          
          status = markStatusFailed(status, jobError);
          jobQueueService.updateJobStatus(job.conversationId, status);
          conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);
          
          // Remove job from queue
          jobQueueService.removeJob(job.conversationId);
        }
      }
    }
  }

  /**
   * Executes a deep research followup job with incremental streaming
   */
  private async executeDeepResearchFollowupJob(job: JobData): Promise<void> {
    const context = requestContextService.createRequestContext({
      toolName: job.toolName,
      conversationId: job.conversationId,
    });

    const { query, reasoning_effort } = job.params;

    try {
      // Get current status
      let status = jobQueueService.getJobStatus(job.conversationId);
      if (!status) {
        throw new Error('Job status not found');
      }

      // Update status to in_progress
      status = updateStatusWithProgress(status, 'Starting deep research followup query...', 0);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Load existing conversation
      const conversation = await conversationPersistenceService.loadConversation(
        job.conversationId,
        context
      );

      // Prepare API request with full conversation history
      const requestPayload = {
        model: 'sonar-deep-research' as const,
        messages: conversation.messages, // Use existing conversation messages (user message already appended)
        stream: false,
        reasoning_effort: reasoning_effort || config.perplexityDefaultEffort,
      };

      logger.info('Calling Perplexity API for deep research followup', { ...context });

      // Update progress
      status = updateStatusWithProgress(status, 'Querying Perplexity API...', 25);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Make API call
      const response = await perplexityApiService.chatCompletion(requestPayload, context);

      const rawResultText = response.choices?.[0]?.message?.content;
      
      if (!rawResultText) {
        throw new McpError(
          BaseErrorCode.SERVICE_UNAVAILABLE,
          'Perplexity API returned an empty response.',
          { responseId: response.id }
        );
      }

      // Update progress
      status = updateStatusWithProgress(status, 'Received response, saving results...', 75);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Append the assistant's response to the conversation
      await conversationPersistenceService.appendToConversation(
        job.conversationId,
        { role: 'assistant', content: rawResultText },
        context,
        false
      );

      // Update progress
      status = updateStatusWithProgress(status, 'Finalizing...', 90);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Mark as completed
      status = markStatusCompleted(status);
      jobQueueService.updateJobStatus(job.conversationId, status);
      conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);

      // Remove job from queue
      jobQueueService.removeJob(job.conversationId);

      logger.info('Deep research followup job completed successfully', {
        ...context,
        conversationId: job.conversationId,
        responseId: response.id,
        model: response.model,
      });

    } catch (error) {
      logger.error('Deep research followup job failed', {
        ...context,
        conversationId: job.conversationId,
        error: error instanceof Error ? error.message : String(error),
        attempt: job.attempts + 1,
      });

      // Get current status
      let status = jobQueueService.getJobStatus(job.conversationId);
      if (status) {
        // Create error object
        const jobError: JobError = {
          code: error instanceof McpError ? error.code : BaseErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof McpError ? error.details : {},
          stackTrace: error instanceof Error ? error.stack : undefined,
        };

        // Check if we should retry
        const maxRetries = config.perplexityMaxJobRetries;
        const currentAttempt = status.attempts || 0;
        
        if (currentAttempt < maxRetries) {
          // Retry: mark for retry and re-enqueue
          logger.info(`Retrying job ${job.conversationId} (attempt ${currentAttempt + 1} of ${maxRetries})`, {
            ...context,
            conversationId: job.conversationId,
            currentAttempt,
            maxRetries,
          });
          
          status = markStatusForRetry(status, jobError);
          jobQueueService.updateJobStatus(job.conversationId, status);
          conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);
          
          // Job will be picked up again by the worker since status is PENDING
        } else {
          // Max retries exceeded: mark as permanently failed
          logger.error(`Job ${job.conversationId} failed after ${currentAttempt} attempts`, {
            ...context,
            conversationId: job.conversationId,
            maxRetries,
          });
          
          status = markStatusFailed(status, jobError);
          jobQueueService.updateJobStatus(job.conversationId, status);
          conversationPersistenceService.updateConversationStatus(job.conversationId, status, context);
          
          // Remove job from queue
          jobQueueService.removeJob(job.conversationId);
        }
      }
    }
  }

  /**
   * Gets the current status of the worker
   */
  getWorkerStatus(): { isRunning: boolean; activeJobCount: number; queuedJobCount: number } {
    return {
      isRunning: this.isRunning,
      activeJobCount: this.activeJobCount,
      queuedJobCount: jobQueueService.listActiveJobs().length,
    };
  }
}

export const backgroundWorkerService = new BackgroundWorkerService();

