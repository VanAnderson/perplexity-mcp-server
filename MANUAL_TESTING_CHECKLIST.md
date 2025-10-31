# Manual Testing Checklist for Async Deep Research

## Prerequisites
- [ ] IDE restarted with `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH=true` in env config
- [ ] Server running without errors
- [ ] Background worker started (check logs for "Background worker started successfully")

---

## Test 1: Basic Async Deep Research
**Objective:** Verify deep research returns immediately and queues job

### Steps:
1. Call `perplexity_deep_research` with a simple query:
   ```
   Query: "What are the key features of TypeScript 5.x?"
   Reasoning effort: medium
   ```

### Expected Results:
- [ ] Tool returns immediately (< 1 second)
- [ ] Response contains:
  - [ ] `conversationId`
  - [ ] `responseId: "queued"`
  - [ ] Instructions to use `get_conversation_history`
  - [ ] `conversationPath`
- [ ] Conversation directory created in `conversation-logs/`
- [ ] Files exist: `conversation.json`, `status.json`, `job.json`

---

## Test 2: Status Polling - Pending
**Objective:** Check status immediately after queueing

### Steps:
1. Immediately call `get_conversation_history` with the conversation ID from Test 1

### Expected Results:
- [ ] Status message shows: "🕒 **Job Status: Pending**"
- [ ] Message says "queued and waiting to start"
- [ ] Instructions to check again in a few seconds
- [ ] Conversation only has user's query (no assistant response yet)

---

## Test 3: Status Polling - In Progress
**Objective:** Check status while job is processing

### Steps:
1. Wait 2-5 seconds
2. Call `get_conversation_history` again with same conversation ID

### Expected Results:
- [ ] Status message shows: "⏳ **Job Status: In Progress**"
- [ ] Progress information displayed:
  - [ ] Message: "Querying Perplexity API..." or similar
  - [ ] Percentage (if available)
  - [ ] Elapsed time
- [ ] Instructions to check again soon

---

## Test 4: Status Polling - Completed
**Objective:** Verify completed job returns full results

### Steps:
1. Wait for job to complete (may take 1-3 minutes for deep research)
2. Call `get_conversation_history` with same conversation ID

### Expected Results:
- [ ] Status message shows: "✅ **Job Status: Completed**"
- [ ] Full conversation displayed with:
  - [ ] System prompt
  - [ ] User query
  - [ ] Complete assistant response (comprehensive research report)
- [ ] No more status polling needed

---

## Test 5: Multiple Concurrent Deep Research Queries
**Objective:** Verify multiple jobs can run simultaneously

### Steps:
1. Queue 3 deep research queries in quick succession:
   - Query 1: "Explain quantum computing basics"
   - Query 2: "History of JavaScript frameworks"
   - Query 3: "Climate change mitigation strategies"
2. Note all 3 conversation IDs
3. Poll each conversation ID independently

### Expected Results:
- [ ] All 3 queries return immediately with "queued" status
- [ ] Each has unique conversation ID
- [ ] Can poll each independently
- [ ] All eventually complete successfully
- [ ] Check logs: multiple jobs processed (may be sequential or parallel depending on worker capacity)

---

## Test 6: Block Search Followup on In-Progress Job
**Objective:** Verify followups are blocked during processing

### Steps:
1. Start a deep research query
2. Immediately try `perplexity_search_followup` on that conversation ID
   ```
   Conversation ID: [from step 1]
   Query: "Tell me more about this"
   ```

### Expected Results:
- [ ] Error thrown with message containing:
  - [ ] "Cannot perform followup"
  - [ ] "in-progress job"
  - [ ] "still being processed"
  - [ ] Instructions to wait and use `get_conversation_history`
- [ ] Followup NOT executed
- [ ] Original job continues unaffected

---

## Test 7: Block Deep Research Followup on In-Progress Job
**Objective:** Same as Test 6 but for deep research followup

### Steps:
1. Start a deep research query
2. Immediately try `perplexity_deep_research_followup` on that conversation ID
   ```
   Conversation ID: [from step 1]
   Query: "Expand on the first point"
   Reasoning effort: high
   ```

### Expected Results:
- [ ] Same error as Test 6
- [ ] Followup blocked
- [ ] Original job unaffected

---

## Test 8: Search Followup After Completion
**Objective:** Verify followups work normally after job completes

### Steps:
1. Wait for a deep research job to complete (from previous tests)
2. Call `perplexity_search_followup`:
   ```
   Conversation ID: [completed conversation]
   Query: "Can you summarize the key points?"
   ```

### Expected Results:
- [ ] Followup executes successfully
- [ ] Response contains answer
- [ ] Conversation updated with new exchange
- [ ] No blocking error

---

## Test 9: Async Deep Research Followup After Completion
**Objective:** Verify async followup queues new job

### Steps:
1. Use a completed conversation from previous tests
2. Call `perplexity_deep_research_followup`:
   ```
   Conversation ID: [completed conversation]
   Query: "Please analyze the implications of point 2 in greater depth"
   Reasoning effort: high
   ```

### Expected Results:
- [ ] Returns immediately with "queued" status
- [ ] Same conversation ID (continues existing conversation)
- [ ] `responseId: "queued"`
- [ ] User message appended to conversation
- [ ] Status reset to "pending"
- [ ] Can poll for completion
- [ ] Eventually completes with assistant response added

---

## Test 10: Status File Contents
**Objective:** Verify status files are correctly formatted

### Steps:
1. Navigate to a conversation directory
2. Check `status.json` contents at different stages

### Expected Results:
- [ ] **Pending stage:**
  ```json
  {
    "conversationId": "...",
    "status": "pending",
    "toolName": "perplexity_deep_research",
    "startedAt": "ISO timestamp",
    "updatedAt": "ISO timestamp"
  }
  ```
- [ ] **In-progress stage:**
  - [ ] `status: "in_progress"`
  - [ ] `progress` object with `message`, `percentage`, `elapsedMs`
  - [ ] `updatedAt` more recent than `startedAt`
- [ ] **Completed stage:**
  - [ ] `status: "completed"`
  - [ ] `completedAt` timestamp present
  - [ ] No `error` field

---

## Test 11: Job File Contents
**Objective:** Verify job files contain correct data

### Steps:
1. Check `job.json` in a conversation directory

### Expected Results:
- [ ] Contains:
  - [ ] `conversationId`
  - [ ] `toolName` (e.g., "perplexity_deep_research")
  - [ ] `params` object with:
    - [ ] `query`
    - [ ] `reasoning_effort`
  - [ ] `createdAt` timestamp
  - [ ] `attempts: 0`
  - [ ] `maxAttempts: 3`
  - [ ] `priority: 0`

---

## Test 12: Background Worker Logs
**Objective:** Verify worker is processing jobs correctly

### Steps:
1. Check server logs during job processing

### Expected Results:
- [ ] Log entries show:
  - [ ] "Job enqueued successfully"
  - [ ] "Job dequeued"
  - [ ] "Executing job"
  - [ ] "Calling Perplexity API for deep research"
  - [ ] "Deep research job completed successfully"
- [ ] No error messages
- [ ] Timestamps show reasonable processing time

---

## Test 13: Error Handling - API Failure
**Objective:** Verify graceful handling of API errors

### Steps:
1. (Optional) Temporarily set invalid API key to force error
2. Queue a deep research job
3. Poll for status

### Expected Results:
- [ ] Job eventually reaches "failed" status
- [ ] Status message shows: "❌ **Job Status: Failed**"
- [ ] Error details displayed:
  - [ ] Error code
  - [ ] Error message
  - [ ] Timestamp of failure
- [ ] Job removed from queue
- [ ] Server continues running normally

---

## Test 14: Server Restart Recovery
**Objective:** Verify stalled jobs are recovered on restart

### Steps:
1. Queue a deep research job
2. While it's processing (in_progress), kill the server
3. Restart the server
4. Check logs and conversation status

### Expected Results:
- [ ] On startup, logs show: "Recovered X stalled jobs"
- [ ] Stalled job status reset to "pending"
- [ ] Job gets processed again
- [ ] Eventually completes successfully

---

## Test 15: Blocking Mode (Default Behavior)
**Objective:** Verify blocking mode still works when async disabled

### Steps:
1. Restart IDE with `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH=false` or unset
2. Call `perplexity_deep_research`
3. Wait for response

### Expected Results:
- [ ] Tool blocks until completion (may take 1-3 minutes)
- [ ] Returns complete response immediately
- [ ] No "queued" message
- [ ] Full research report in response
- [ ] No status.json or job.json files created
- [ ] Conversation.json created normally

---

## Summary Checklist

After completing all tests:

- [ ] All 15 tests passed
- [ ] No unexpected errors in logs
- [ ] Background worker functioning correctly
- [ ] Status transitions work properly (pending → in_progress → completed)
- [ ] Followup blocking works as expected
- [ ] Async followups queue correctly
- [ ] Multiple concurrent jobs handled
- [ ] Error handling graceful
- [ ] Server restart recovery works
- [ ] Blocking mode still functional

---

## Notes Section

Use this space to document any issues found:

```
Issue 1:
- Test: 
- What happened:
- Expected:
- Logs:

Issue 2:
- Test:
- What happened:
- Expected:
- Logs:
```

---

## Performance Observations

Document performance metrics:

- Average deep research completion time: _____ minutes
- Number of concurrent jobs tested: _____
- Memory usage during processing: _____
- Any lag or slowdowns observed: _____


