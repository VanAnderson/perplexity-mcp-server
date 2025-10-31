/**
 * @fileoverview Tests for async deep research functionality
 * Tests non-blocking mode, job queueing, followup blocking, and status tracking
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from '@jest/globals';
import nock from 'nock';
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { perplexityDeepResearchLogic, PerplexityDeepResearchInput } from '../../../src/mcp-server/tools/perplexityDeepResearch/logic.js';
import { perplexityDeepResearchFollowupLogic, PerplexityDeepResearchFollowupInput } from '../../../src/mcp-server/tools/perplexityDeepResearchFollowup/logic.js';
import { perplexitySearchFollowupLogic, PerplexitySearchFollowupInput } from '../../../src/mcp-server/tools/perplexitySearchFollowup/logic.js';
import { createMockContext } from '../../fixtures/contexts.js';
import { mockDeepResearchResponse } from '../../fixtures/perplexity-responses.js';
import { config } from '../../../src/config/index.js';
import { jobQueueService, conversationPersistenceService } from '../../../src/services/index.js';
import { JobStatus } from '../../../src/types-global/job-status.js';

describe('Async Deep Research', () => {
  const context = createMockContext({ toolName: 'perplexity_deep_research' });
  const apiBaseUrl = config.perplexityApiBaseUrl;
  let originalAsyncFlag: boolean;
  // Use the standard test directory that's already configured
  const testConversationsDir = config.conversationLogsDir;

  beforeAll(() => {
    // Enable async mode for tests
    originalAsyncFlag = config.perplexityEnableAsyncDeepResearch;
    (config as any).perplexityEnableAsyncDeepResearch = true;
  });

  afterAll(() => {
    // Restore original flag
    (config as any).perplexityEnableAsyncDeepResearch = originalAsyncFlag;
  });

  beforeEach(() => {
    nock.cleanAll();
    
    // Clean up test conversations before each test for isolation
    if (existsSync(testConversationsDir)) {
      rmSync(testConversationsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    nock.cleanAll();
    
    // Clean up test conversations after each test
    if (existsSync(testConversationsDir)) {
      rmSync(testConversationsDir, { recursive: true, force: true });
    }
  });

  describe('non-blocking mode', () => {
    it('returns immediately with conversation ID when async mode is enabled', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test async deep research query',
        reasoning_effort: 'medium',
      };

      const response = await perplexityDeepResearchLogic(input, context);

      // Should return immediately without making API call
      expect(response).toBeDefined();
      expect(response.conversationId).toBeDefined();
      expect(response.responseId).toBe('queued');
      expect(response.rawResultText).toContain('queued for background processing');
      expect(response.rawResultText).toContain('get_conversation_history');
      expect(response.usage.total_tokens).toBe(0); // No API call yet
    });

    it('creates conversation and job files', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test file creation',
        reasoning_effort: 'low',
      };

      const response = await perplexityDeepResearchLogic(input, context);
      const conversationId = response.conversationId;

      // Use the service methods to check status and job instead of direct file access
      const status = conversationPersistenceService.getConversationStatus(conversationId, context);
      expect(status).toBeDefined();
      expect(status!.status).toBe(JobStatus.PENDING);
      expect(status!.toolName).toBe('perplexity_deep_research');

      const jobStatus = jobQueueService.getJobStatus(conversationId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus!.conversationId).toBe(conversationId);
    });

    it('queues job with correct parameters', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test job queueing',
        reasoning_effort: 'high',
      };

      const response = await perplexityDeepResearchLogic(input, context);
      const conversationId = response.conversationId;

      const status = jobQueueService.getJobStatus(conversationId);
      expect(status).toBeDefined();
      expect(status!.status).toBe(JobStatus.PENDING);
      expect(status!.conversationId).toBe(conversationId);
    });
  });

  describe('followup blocking when in-progress', () => {
    it('blocks search followup when job is in-progress', async () => {
      // Create a conversation with in-progress status
      const conversation = await conversationPersistenceService.createConversationWithStatus(
        [
          { role: 'system', content: 'test' },
          { role: 'user', content: 'original query' },
        ],
        'perplexity_deep_research',
        context
      );

      // Manually set status to in_progress
      const status = conversationPersistenceService.getConversationStatus(conversation.conversationId, context);
      if (status) {
        status.status = JobStatus.IN_PROGRESS;
        conversationPersistenceService.updateConversationStatus(conversation.conversationId, status, context);
      }

      const followupInput: PerplexitySearchFollowupInput = {
        conversationId: conversation.conversationId,
        query: 'followup query',
      };

      await expect(perplexitySearchFollowupLogic(followupInput, context)).rejects.toThrow(
        /in-progress job/
      );
    });

    it('blocks deep research followup when job is in-progress', async () => {
      // Create a conversation with in-progress status
      const conversation = await conversationPersistenceService.createConversationWithStatus(
        [
          { role: 'system', content: 'test' },
          { role: 'user', content: 'original query' },
        ],
        'perplexity_deep_research',
        context
      );

      // Manually set status to in_progress
      const status = conversationPersistenceService.getConversationStatus(conversation.conversationId, context);
      if (status) {
        status.status = JobStatus.IN_PROGRESS;
        conversationPersistenceService.updateConversationStatus(conversation.conversationId, status, context);
      }

      const followupInput: PerplexityDeepResearchFollowupInput = {
        conversationId: conversation.conversationId,
        query: 'deep research followup',
        reasoning_effort: 'medium',
      };

      await expect(perplexityDeepResearchFollowupLogic(followupInput, context)).rejects.toThrow(
        /in-progress job/
      );
    });

    it('allows followup when job is completed', async () => {
      // Create a conversation with completed status
      const conversation = await conversationPersistenceService.createConversationWithStatus(
        [
          { role: 'system', content: 'test' },
          { role: 'user', content: 'original query' },
          { role: 'assistant', content: 'original response' },
        ],
        'perplexity_deep_research',
        context
      );

      // Set status to completed
      const status = conversationPersistenceService.getConversationStatus(conversation.conversationId, context);
      if (status) {
        status.status = JobStatus.COMPLETED;
        conversationPersistenceService.updateConversationStatus(conversation.conversationId, status, context);
      }

      const followupInput: PerplexityDeepResearchFollowupInput = {
        conversationId: conversation.conversationId,
        query: 'followup after completion',
        reasoning_effort: 'medium',
      };

      // This should queue a new job instead of throwing
      const response = await perplexityDeepResearchFollowupLogic(followupInput, context);

      expect(response).toBeDefined();
      expect(response.conversationId).toBe(conversation.conversationId);
      expect(response.responseId).toBe('queued');
      expect(response.rawResultText).toContain('followup query has been queued');
    });
  });

  describe('async deep research followup', () => {
    it('queues followup job in async mode', async () => {
      // Create a completed conversation first
      const conversation = await conversationPersistenceService.createConversationWithStatus(
        [
          { role: 'system', content: 'test' },
          { role: 'user', content: 'original query' },
          { role: 'assistant', content: 'original response' },
        ],
        'perplexity_deep_research',
        context
      );

      // Mark as completed
      const status = conversationPersistenceService.getConversationStatus(conversation.conversationId, context);
      if (status) {
        status.status = JobStatus.COMPLETED;
        conversationPersistenceService.updateConversationStatus(conversation.conversationId, status, context);
      }

      const followupInput: PerplexityDeepResearchFollowupInput = {
        conversationId: conversation.conversationId,
        query: 'async followup query',
        reasoning_effort: 'high',
      };

      const response = await perplexityDeepResearchFollowupLogic(followupInput, context);

      // Should return immediately
      expect(response.responseId).toBe('queued');
      expect(response.conversationId).toBe(conversation.conversationId);

      // Check that job status is pending
      const jobStatus = jobQueueService.getJobStatus(conversation.conversationId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus!.status).toBe(JobStatus.PENDING);

      // Check that user message was appended
      const updatedConversation = await conversationPersistenceService.loadConversation(
        conversation.conversationId,
        context
      );
      expect(updatedConversation.messageCount).toBe(4); // system + user + assistant + followup user
      expect(updatedConversation.messages[3].role).toBe('user');
      expect(updatedConversation.messages[3].content).toBe('async followup query');
    });

    it('updates status to pending for followup job', async () => {
      // Create a completed conversation
      const conversation = await conversationPersistenceService.createConversationWithStatus(
        [
          { role: 'system', content: 'test' },
          { role: 'user', content: 'original query' },
          { role: 'assistant', content: 'original response' },
        ],
        'perplexity_deep_research',
        context
      );

      // Mark as completed
      let status = conversationPersistenceService.getConversationStatus(conversation.conversationId, context);
      if (status) {
        status.status = JobStatus.COMPLETED;
        conversationPersistenceService.updateConversationStatus(conversation.conversationId, status, context);
      }

      const followupInput: PerplexityDeepResearchFollowupInput = {
        conversationId: conversation.conversationId,
        query: 'test status update',
        reasoning_effort: 'medium',
      };

      await perplexityDeepResearchFollowupLogic(followupInput, context);

      // Check that status was updated to pending
      status = conversationPersistenceService.getConversationStatus(conversation.conversationId, context);
      expect(status).toBeDefined();
      expect(status!.status).toBe(JobStatus.PENDING);
    });
  });

  describe('job queue operations', () => {
    it('can dequeue a pending job', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test dequeue - unique query for isolation',
        reasoning_effort: 'medium',
      };

      const response = await perplexityDeepResearchLogic(input, context);
      const conversationId = response.conversationId;

      // Verify job was created with pending status
      const createdJob = jobQueueService.getJobStatus(conversationId);
      expect(createdJob).toBeDefined();
      expect(createdJob!.status).toBe(JobStatus.PENDING);

      // Dequeue a job (should be our job since we cleaned up before)
      const job = jobQueueService.dequeueJob();

      expect(job).toBeDefined();
      expect(job!.toolName).toBe('perplexity_deep_research');
      
      // The dequeued job should now have in_progress status
      const dequeuedStatus = jobQueueService.getJobStatus(job!.conversationId);
      expect(dequeuedStatus).toBeDefined();
      expect(dequeuedStatus!.status).toBe(JobStatus.IN_PROGRESS);
    });

    it('does not dequeue the same job twice', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test double dequeue prevention',
        reasoning_effort: 'medium',
      };

      const response = await perplexityDeepResearchLogic(input, context);
      const conversationId = response.conversationId;

      // Verify job starts as pending
      let status = jobQueueService.getJobStatus(conversationId);
      expect(status!.status).toBe(JobStatus.PENDING);

      // Dequeue once
      const job1 = jobQueueService.dequeueJob();
      expect(job1).toBeDefined();
      const firstJobId = job1!.conversationId;

      // Verify the first job is now in_progress
      status = jobQueueService.getJobStatus(firstJobId);
      expect(status!.status).toBe(JobStatus.IN_PROGRESS);

      // Try to dequeue again
      const job2 = jobQueueService.dequeueJob();
      
      // Should either be null or a different job, but never the same job
      if (job2) {
        expect(job2.conversationId).not.toBe(firstJobId);
      }
    });

    it('can list active jobs', async () => {
      const input1: PerplexityDeepResearchInput = {
        query: 'Test list active jobs 1',
        reasoning_effort: 'medium',
      };
      const input2: PerplexityDeepResearchInput = {
        query: 'Test list active jobs 2',
        reasoning_effort: 'medium',
      };

      const response1 = await perplexityDeepResearchLogic(input1, context);
      const response2 = await perplexityDeepResearchLogic(input2, context);

      const activeJobs = jobQueueService.listActiveJobs();
      
      // Check that our jobs are in the list
      expect(activeJobs).toContain(response1.conversationId);
      expect(activeJobs).toContain(response2.conversationId);
      expect(activeJobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('status tracking', () => {
    it('creates status file with pending state', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test status creation',
        reasoning_effort: 'medium',
      };

      const response = await perplexityDeepResearchLogic(input, context);
      const status = conversationPersistenceService.getConversationStatus(response.conversationId, context);

      expect(status).toBeDefined();
      expect(status!.status).toBe(JobStatus.PENDING);
      expect(status!.toolName).toBe('perplexity_deep_research');
      expect(status!.conversationId).toBe(response.conversationId);
      expect(status!.startedAt).toBeDefined();
      expect(status!.updatedAt).toBeDefined();
    });

    it('updates status when job is dequeued', async () => {
      const input: PerplexityDeepResearchInput = {
        query: 'Test status update on dequeue - isolated',
        reasoning_effort: 'medium',
      };

      const response = await perplexityDeepResearchLogic(input, context);
      const conversationId = response.conversationId;
      
      // Verify initial status is pending
      let status = conversationPersistenceService.getConversationStatus(conversationId, context);
      expect(status).toBeDefined();
      expect(status!.status).toBe(JobStatus.PENDING);

      // Dequeue a job
      const job = jobQueueService.dequeueJob();
      expect(job).toBeDefined();

      // Verify the dequeued job's status was updated to in_progress
      const dequeuedJobStatus = jobQueueService.getJobStatus(job!.conversationId);
      expect(dequeuedJobStatus).toBeDefined();
      expect(dequeuedJobStatus!.status).toBe(JobStatus.IN_PROGRESS);

      // Also verify via conversation persistence service
      const persistenceStatus = conversationPersistenceService.getConversationStatus(job!.conversationId, context);
      expect(persistenceStatus).toBeDefined();
      expect(persistenceStatus!.status).toBe(JobStatus.IN_PROGRESS);
    });
  });
});

