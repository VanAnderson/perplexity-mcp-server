# Manual Testing Plan v2 - Async Deep Research with Race Fix & Retry Logic

## 🎯 **Test Objectives**

1. ✅ Verify async deep research returns immediately
2. ✅ Verify status polling shows correct states
3. ✅ Verify multiple concurrent queries work
4. ✅ Verify followup blocking when in-progress
5. ✅ Verify async deep research followups
6. 🆕 **Verify race condition is fixed (no duplicate processing)**
7. 🆕 **Verify retry logic works correctly**
8. 🆕 **Verify error history tracking**
9. 🆕 **Verify enhanced status messages**

---

## 📋 **Test Suite**

### **Test 1: Basic Async Deep Research (Baseline)**

**Objective:** Verify non-blocking mode returns immediately

**Steps:**
1. Ensure `PERPLEXITY_ENABLE_ASYNC_DEEP_RESEARCH=true` in MCP config
2. Submit a deep research query
3. Measure response time (should be < 1 second)

**Expected Results:**
- ✅ Returns immediately with conversation ID
- ✅ Message mentions "queued for background processing"
- ✅ Instructions for polling provided
- ✅ `conversation.json`, `status.json`, and `job.json` files created

**Tool Call:**
```javascript
mcp_perplexity_perplexity_deep_research({
  query: "What are the latest developments in quantum computing error correction?",
  reasoning_effort: "medium"
})
```

---

### **Test 2: Status Progression (Pending → In Progress → Completed)**

**Objective:** Verify status transitions correctly

**Steps:**
1. Immediately after Test 1, poll status
2. Wait 5 seconds, poll again
3. Wait for completion (1-2 minutes), poll final time

**Expected Results:**
- ✅ Initial poll shows "pending" or "in_progress"
- ✅ Progress updates show percentage and elapsed time
- ✅ Final poll shows "completed"
- ✅ Full research report in conversation messages

**Tool Call:**
```javascript
mcp_perplexity_get_conversation_history({
  conversationId: "[ID from Test 1]"
})
```

---

### **Test 3: 🆕 Race Condition Prevention - Rapid Concurrent Queries**

**Objective:** Verify no duplicate processing when jobs are queued rapidly

**Steps:**
1. Submit 3-5 deep research queries as fast as possible (within same second)
2. Wait 10 seconds
3. Check each conversation directory

**Expected Results:**
- ✅ Each conversation has exactly ONE `job.json`
- ✅ Each conversation has exactly ONE assistant response (when completed)
- ✅ No duplicate `responseId` values in logs
- ✅ Logs show jobs dequeued only once each

**Tool Calls:**
```javascript
// Submit rapidly one after another:
mcp_perplexity_perplexity_deep_research({
  query: "Explain React Server Components advantages",
  reasoning_effort: "low"
})

mcp_perplexity_perplexity_deep_research({
  query: "What are the key features of TypeScript 5.5?",
  reasoning_effort: "low"
})

mcp_perplexity_perplexity_deep_research({
  query: "Describe Rust memory safety mechanisms",
  reasoning_effort: "low"
})
```

**Verification:**
```bash
# Check for duplicates in each conversation
ls conversation-logs/*/conversation.json | while read f; do
  count=$(jq '.messages | map(select(.role == "assistant")) | length' "$f")
  echo "$f: $count assistant messages"
done
# All should show "1 assistant messages" when completed

# Check logs for duplicate dequeue
grep "Job dequeued" logs/combined.log | sort
# Each conversation ID should appear only once
```

---

### **Test 4: 🆕 Retry Logic - Forced Failure with Recovery**

**Objective:** Verify jobs retry on failure and track error history

**Steps:**
1. Set `PERPLEXITY_MAX_JOB_RETRIES=1` (for faster testing)
2. Create a scenario likely to fail initially (e.g., extremely long conversation)
3. Monitor retry attempts
4. Check final status and error history

**Expected Results:**
- ✅ Status shows "pending" between retries
- ✅ Status message shows "Retry Attempt: 2"
- ✅ Each retry is logged with attempt number
- ✅ After max retries, status becomes "failed"
- ✅ Error history contains all encountered errors
- ✅ Final error message shows complete history

**Setup:**
```json
// In MCP config
"env": {
  "PERPLEXITY_MAX_JOB_RETRIES": "1"
}
```

**Tool Call:**
```javascript
// Use a very long conversation or problematic query
mcp_perplexity_perplexity_deep_research_followup({
  conversationId: "[long conversation ID from Test 3]",
  query: "Can you provide even more detail on every single point?",
  reasoning_effort: "high"
})
```

**Verification:**
```bash
# Check logs for retry attempts
grep "Retrying job" logs/combined.log

# Check status.json for error history
cat conversation-logs/[CONVERSATION_ID]/status.json | jq '.errorHistory'

# Should show array of errors
```

---

### **Test 5: 🆕 Status Messages with Retry Information**

**Objective:** Verify enhanced status messages show retry details

**Steps:**
1. Using conversation from Test 4 (with retries)
2. Poll status during each retry attempt
3. Verify status messages are informative

**Expected Results:**
- ✅ Pending: "**Retry Attempt:** 2 (previous attempts encountered errors)"
- ✅ In Progress: "**Current Attempt:** 2"
- ✅ Failed: Shows complete error history with numbered list

**Tool Call:**
```javascript
mcp_perplexity_get_conversation_history({
  conversationId: "[ID from Test 4]"
})
```

**Expected Status Message Examples:**

**Pending (Retry):**
```markdown
🕒 **Job Status: Pending**

This deep research query is queued and waiting to start.
**Retry Attempt:** 2 (previous attempts encountered errors)

**What to do:**
- Check back in a moment
```

**In Progress (Retry):**
```markdown
⏳ **Job Status: In Progress** (25%)

**Progress:** Querying Perplexity API...
**Elapsed Time:** 0 minutes
**Current Attempt:** 2
```

**Failed (After Retries):**
```markdown
❌ **Job Status: Failed**

This deep research query encountered an error and could not be completed after 2 attempts.

**Latest Error Code:** INTERNAL_ERROR
**Latest Error Message:** Request failed with status code 400

**Error History:**
1. [INTERNAL_ERROR] Request failed with status code 400
2. [INTERNAL_ERROR] Request failed with status code 400
```

---

### **Test 6: Multiple Concurrent Queries (No Race Condition)**

**Objective:** Verify concurrent processing works without conflicts

**Steps:**
1. Queue 3 deep research queries simultaneously
2. Monitor all 3 for completion
3. Verify no cross-contamination

**Expected Results:**
- ✅ All 3 process independently
- ✅ No shared state issues
- ✅ Each has correct response
- ✅ Status files track independently

**Tool Calls:**
```javascript
// Submit all three in rapid succession
mcp_perplexity_perplexity_deep_research({
  query: "Compare Python async/await vs JavaScript promises",
  reasoning_effort: "medium"
})

mcp_perplexity_perplexity_deep_research({
  query: "Explain Docker vs Kubernetes fundamental differences",
  reasoning_effort: "medium"
})

mcp_perplexity_perplexity_deep_research({
  query: "What are the main GraphQL vs REST API tradeoffs?",
  reasoning_effort: "medium"
})
```

---

### **Test 7: Followup Blocking During In-Progress**

**Objective:** Verify followups blocked when job is processing

**Steps:**
1. Submit deep research query
2. Immediately try search followup
3. Immediately try deep research followup
4. Wait for completion
5. Retry followups

**Expected Results:**
- ✅ Both followup attempts blocked with clear error
- ✅ Error mentions "in-progress job"
- ✅ After completion, followups work

**Tool Calls:**
```javascript
// First query
const result = mcp_perplexity_perplexity_deep_research({
  query: "Explain machine learning optimization algorithms",
  reasoning_effort: "medium"
})

// Immediately attempt followups (should fail)
mcp_perplexity_perplexity_search_followup({
  conversationId: result.conversationId,
  query: "What about Adam optimizer?"
})
// Expected: Error about in-progress job

mcp_perplexity_perplexity_deep_research_followup({
  conversationId: result.conversationId,
  query: "Go deeper into gradient descent variants",
  reasoning_effort: "low"
})
// Expected: Error about in-progress job
```

---

### **Test 8: Async Deep Research Followup**

**Objective:** Verify followups also respect async mode

**Steps:**
1. Complete a deep research query
2. Submit deep research followup
3. Verify it queues asynchronously

**Expected Results:**
- ✅ Followup returns immediately
- ✅ Status shows pending → in_progress → completed
- ✅ Followup appends to existing conversation

**Tool Calls:**
```javascript
// After Test 6 or 7 completes
mcp_perplexity_perplexity_deep_research_followup({
  conversationId: "[completed conversation ID]",
  query: "Can you elaborate on the first major point?",
  reasoning_effort: "medium"
})

// Should return immediately, then poll:
mcp_perplexity_get_conversation_history({
  conversationId: "[same conversation ID]"
})
```

---

### **Test 9: 🆕 Job Queue Atomicity**

**Objective:** Verify job claiming is atomic (technical verification)

**Steps:**
1. Review logs for job dequeue operations
2. Verify each job dequeued exactly once
3. Check for any "Failed to claim job" debug messages

**Expected Results:**
- ✅ Each conversation ID appears once in "Job dequeued" logs
- ✅ "Failed to claim job" messages acceptable (indicates race detected and handled)
- ✅ No duplicate processing despite rapid queueing

**Verification:**
```bash
# Extract all job dequeue events
grep "Job dequeued" logs/combined.log | \
  jq -r '.conversationId' | \
  sort | uniq -d
# Should output nothing (no duplicates)

# Check for race condition detection
grep "Failed to claim job" logs/combined.log
# These are GOOD - they show the fix is working

# Check for jobs claimed by another worker
grep "was claimed by another worker" logs/combined.log
# These are also GOOD - show race detection
```

---

### **Test 10: 🆕 Error Recovery - Retry Success**

**Objective:** Verify that intermittent failures can recover with retry

**Setup:** Use default `PERPLEXITY_MAX_JOB_RETRIES=2` (3 total attempts)

**Steps:**
1. Monitor a job that might have transient issues
2. If it retries, verify it eventually succeeds
3. Check that successful completion clears error state

**Expected Results:**
- ✅ First attempt might fail
- ✅ Status transitions: pending → in_progress → pending (retry) → in_progress → completed
- ✅ Final status is "completed" (not "failed")
- ✅ Error history preserved but status shows success

---

## 🔍 **Validation Checklist**

After running all tests:

### **File Structure Validation**
```bash
# Check a completed conversation has all files
ls conversation-logs/[CONVERSATION_ID]/
# Should show: conversation.json, status.json, (job.json removed after completion)

# Verify no duplicate messages
jq '.messages | group_by(.content) | map(select(length > 1))' \
  conversation-logs/[CONVERSATION_ID]/conversation.json
# Should return empty array []
```

### **Log Validation**
```bash
# Check for duplicate job executions (should be none)
grep "Executing job" logs/combined.log | \
  jq -r '.conversationId' | \
  sort | uniq -d

# Check retry logic is working
grep "Retrying job" logs/combined.log

# Check for race condition fixes working
grep -E "(Failed to claim|was claimed by another)" logs/combined.log

# Verify error tracking
grep "Job.*failed after" logs/combined.log
```

### **Status File Validation**
```bash
# Check a failed job has error history
cat conversation-logs/[FAILED_ID]/status.json | \
  jq '.errorHistory | length'
# Should be > 0 for failed jobs

# Check completed job has attempt count
cat conversation-logs/[COMPLETED_ID]/status.json | \
  jq '.attempts'
# Should show 0 if succeeded first try, or higher if retried
```

---

## 🎯 **Success Criteria**

All tests must pass with:

✅ **No duplicate processing** - Each job executed exactly once  
✅ **Retry logic working** - Failed jobs retry up to configured limit  
✅ **Error history tracked** - All errors preserved in errorHistory array  
✅ **Status messages enhanced** - Show retry attempts and error details  
✅ **Atomic job claiming** - Race condition eliminated  
✅ **Concurrent processing** - Multiple jobs process independently  
✅ **Followup blocking** - Can't followup during processing  
✅ **Async followups** - Deep research followups also queue  

---

## 🐛 **Troubleshooting**

### **If jobs get duplicated:**
- Check logs for "Job dequeued" with same conversation ID appearing twice
- Verify `renameSync()` is being used in `jobQueue.ts`
- Check filesystem supports atomic rename

### **If retries don't happen:**
- Verify `PERPLEXITY_MAX_JOB_RETRIES` is set correctly
- Check logs for "Retrying job" messages
- Verify `markStatusForRetry()` is being called

### **If error history is empty:**
- Check `markStatusForRetry()` and `markStatusFailed()` append to errorHistory
- Verify status.json is being updated correctly
- Check schema allows optional errorHistory field

---

## 📊 **Test Results Template**

| Test | Status | Notes |
|------|--------|-------|
| 1. Basic Async | ⏳ | |
| 2. Status Progression | ⏳ | |
| 3. Race Condition Prevention | ⏳ | |
| 4. Retry Logic | ⏳ | |
| 5. Enhanced Status Messages | ⏳ | |
| 6. Concurrent Processing | ⏳ | |
| 7. Followup Blocking | ⏳ | |
| 8. Async Followup | ⏳ | |
| 9. Job Queue Atomicity | ⏳ | |
| 10. Error Recovery | ⏳ | |

---

## 🚀 **Ready to Test!**

With the race condition fix and retry logic implemented, we can now comprehensively test the async deep research feature to ensure production-readiness.

