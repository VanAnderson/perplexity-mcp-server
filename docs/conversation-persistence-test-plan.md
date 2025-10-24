# Conversation Persistence Test Plan

## Test Objective
Validate that the conversation persistence implementation works correctly across all 5 tools, handles edge cases properly, and provides a seamless multi-turn conversation experience.

---

## Test Suite 1: Basic Conversation Creation

### Test 1.1: perplexity_search Creates Conversation
**Objective**: Verify that a basic search query creates a conversation file

**Steps**:
1. Execute `perplexity_search` with a simple query
   - Query: "What are the latest developments in quantum computing as of 2025?"
   
**Expected Results**:
- Tool returns `conversationId` in response
- Tool returns `conversationPath` in response
- Response includes search results
- Conversation file exists at the specified path
- Conversation file contains:
  - User message with the query
  - Assistant message with the response
  - Proper timestamp format
  - Metadata (model, mode: "search")

**Validation**:
- Extract `conversationId` from response
- Use `get_conversation_history` to retrieve the conversation
- Verify conversation structure matches expected format

---

### Test 1.2: perplexity_deep_research Creates Conversation
**Objective**: Verify that deep research queries create conversations

**Steps**:
1. Execute `perplexity_deep_research` with a complex query
   - Query: "Provide a comprehensive analysis of renewable energy adoption trends globally, including economic factors, technological barriers, and policy impacts"
   - reasoning_effort: "medium"

**Expected Results**:
- Tool returns `conversationId` in response
- Tool returns `conversationPath` in response
- Response includes comprehensive research results
- Conversation file contains:
  - User message with query
  - Assistant message with response
  - Metadata includes mode: "deep_research"
  - Metadata includes reasoning_effort: "medium"

**Validation**:
- Use `get_conversation_history` to verify conversation structure
- Verify deep research response quality

---

## Test Suite 2: Follow-up Conversations (Same Mode)

### Test 2.1: Search Follow-up on Search Conversation
**Objective**: Verify that follow-up searches maintain conversation context

**Steps**:
1. Create initial search conversation (reuse conversationId from Test 1.1)
2. Execute `perplexity_search_followup`:
   - conversationId: [from Test 1.1]
   - query: "What specific companies are leading these quantum computing developments?"

**Expected Results**:
- Follow-up response contextually relates to original query
- Same `conversationId` returned
- Conversation file now contains 4 messages (2 user, 2 assistant)
- Messages in chronological order
- Each message has unique timestamp

**Validation**:
- Use `get_conversation_history` to verify:
  - All 4 messages present
  - Correct order
  - Timestamps are sequential
  - Context maintained between queries

---

### Test 2.2: Deep Research Follow-up on Deep Research
**Objective**: Verify deep research follow-ups work correctly

**Steps**:
1. Use conversationId from Test 1.2
2. Execute `perplexity_deep_research_followup`:
   - conversationId: [from Test 1.2]
   - query: "Focus specifically on solar energy adoption in developing nations"
   - reasoning_effort: "high"

**Expected Results**:
- Follow-up provides focused analysis on solar energy
- References context from original renewable energy query
- Conversation contains 4 messages
- New reasoning_effort level applied

**Validation**:
- Use `get_conversation_history` to verify conversation integrity
- Verify context continuity

---

## Test Suite 3: Cross-Mode Conversations

### Test 3.1: Deep Research Follow-up on Search Conversation
**Objective**: Verify cross-mode functionality (search → deep research)

**Steps**:
1. Create new search conversation:
   - Query: "What is the current state of AI regulation in the European Union?"
2. Follow up with `perplexity_deep_research_followup`:
   - conversationId: [from step 1]
   - query: "Provide detailed analysis of how these regulations compare to US and Chinese AI policies"
   - reasoning_effort: "high"

**Expected Results**:
- Deep research leverages context from initial search
- Conversation shows mode transition (search → deep_research)
- Response demonstrates understanding of prior context
- All messages preserved in conversation file

**Validation**:
- Use `get_conversation_history` to verify:
  - First exchange marked as "search" mode
  - Second exchange marked as "deep_research" mode
  - Context properly maintained across mode switch

---

### Test 3.2: Search Follow-up on Deep Research Conversation
**Objective**: Verify cross-mode functionality (deep research → search)

**Steps**:
1. Create new deep research conversation:
   - Query: "Comprehensive analysis of blockchain technology's impact on financial systems"
   - reasoning_effort: "high"
2. Follow up with `perplexity_search_followup`:
   - conversationId: [from step 1]
   - query: "What was the latest major blockchain-related announcement this week?"

**Expected Results**:
- Quick search leverages deep research context
- Conversation shows mode transition (deep_research → search)
- Search provides recent, specific information building on deep research

**Validation**:
- Use `get_conversation_history` to verify mode transitions
- Verify response relevance to prior context

---

## Test Suite 4: Multi-Turn Conversations

### Test 4.1: Extended Conversation (5+ turns)
**Objective**: Verify system handles longer conversations correctly

**Steps**:
1. Create initial search: "What is Rust programming language?"
2. Follow-up 1 (search): "How does it compare to C++ for systems programming?"
3. Follow-up 2 (deep research): "Analyze the adoption of Rust in production systems"
4. Follow-up 3 (search): "What major companies use Rust in production?"
5. Follow-up 4 (search): "Show me recent Rust performance benchmarks"

**Expected Results**:
- All 10 messages (5 user, 5 assistant) preserved
- Each response builds on prior context
- Conversation file remains valid JSON
- Chronological ordering maintained
- File size remains manageable

**Validation**:
- Use `get_conversation_history` at each step
- Verify message count increases correctly
- Verify context accumulation
- Check conversation file size and structure

---

## Test Suite 5: Conversation History Retrieval

### Test 5.1: Retrieve Full Conversation
**Objective**: Verify history retrieval with all content

**Steps**:
1. Use conversationId from Test 4.1 (multi-turn conversation)
2. Execute `get_conversation_history`:
   - conversationId: [from Test 4.1]
   - includeSystemPrompt: false

**Expected Results**:
- All messages returned in correct order
- Each message contains: role, content, timestamp
- Response properly formatted
- System prompt excluded

**Validation**:
- Verify message count matches expected (10 messages)
- Verify all content present and readable
- Verify timestamps are sequential

---

### Test 5.2: Retrieve Conversation With System Prompt
**Objective**: Verify system prompt inclusion option

**Steps**:
1. Use any existing conversationId
2. Execute `get_conversation_history`:
   - conversationId: [existing]
   - includeSystemPrompt: true

**Expected Results**:
- All messages returned
- System prompt included as first message
- System prompt shows configuration used for conversation

**Validation**:
- Verify first message is system role
- Verify user/assistant messages follow
- Verify system prompt content is reasonable

---

## Test Suite 6: Search Filtering Parameters

### Test 6.1: Search with Recency Filter
**Objective**: Verify search filtering works in conversations

**Steps**:
1. Create search with recency filter:
   - query: "Latest AI breakthroughs"
   - search_recency_filter: "week"
2. Follow-up maintaining filter:
   - query: "Which breakthrough has the most practical applications?"
   - search_recency_filter: "week"

**Expected Results**:
- Initial search returns recent results only
- Follow-up maintains temporal context
- Conversation metadata includes filter parameters

**Validation**:
- Verify responses focus on recent information
- Check conversation file includes filter metadata

---

### Test 6.2: Search with Domain Filter
**Objective**: Verify domain filtering in conversations

**Steps**:
1. Create search with domain filter:
   - query: "Machine learning research papers"
   - search_domain_filter: ["arxiv.org"]
2. Follow-up:
   - query: "Which of these papers has the highest citation count?"
   - search_domain_filter: ["arxiv.org"]

**Expected Results**:
- Results filtered to specified domain
- Follow-up respects domain constraint
- Conversation maintains filter context

**Validation**:
- Verify source domains in responses
- Check conversation metadata

---

## Test Suite 7: Error Handling

### Test 7.1: Invalid Conversation ID
**Objective**: Verify error handling for non-existent conversations

**Steps**:
1. Execute `perplexity_search_followup`:
   - conversationId: "20251231-9999999999999"
   - query: "Test query"

**Expected Results**:
- Tool returns error
- Error code: `CONVERSATION_NOT_FOUND`
- Error message is clear and actionable
- No conversation file created

**Validation**:
- Verify error structure matches expected format
- Verify helpful error message

---

### Test 7.2: Malformed Conversation ID
**Objective**: Verify validation of conversation ID format

**Steps**:
1. Execute `get_conversation_history`:
   - conversationId: "invalid-id-format"

**Expected Results**:
- Tool returns validation error
- Error indicates invalid format
- No file system operations attempted

**Validation**:
- Verify error is validation error, not file system error
- Verify error message explains expected format

---

### Test 7.3: Empty Query in Follow-up
**Objective**: Verify validation of required parameters

**Steps**:
1. Execute `perplexity_search_followup`:
   - conversationId: [valid id]
   - query: ""

**Expected Results**:
- Tool returns validation error
- Error indicates query is required
- No API calls made

**Validation**:
- Verify Zod validation catches empty query
- Verify error message is clear

---

## Test Suite 8: Concurrent Conversations

### Test 8.1: Multiple Independent Conversations
**Objective**: Verify multiple conversations can exist independently

**Steps**:
1. Create conversation A: "Explain quantum entanglement"
2. Create conversation B: "Explain blockchain consensus"
3. Follow-up A: "How is this used in quantum computing?"
4. Follow-up B: "What are the scalability challenges?"

**Expected Results**:
- Two separate conversation files created
- Different conversationIds
- Follow-ups apply to correct conversations
- No context leakage between conversations

**Validation**:
- Use `get_conversation_history` on both conversations
- Verify each contains only its own messages
- Verify no cross-contamination of context

---

## Test Suite 9: File System Integration

### Test 9.1: Conversation Directory Structure
**Objective**: Verify file system organization

**Steps**:
1. Create 3 different conversations
2. Check file system directly

**Expected Results**:
- `conversation-logs/` directory exists
- Each conversation in its own subdirectory
- Directory names match conversationIds
- Each contains `conversation.json` file
- Files are valid JSON

**Validation**:
- List directory contents
- Verify structure matches specification
- Parse JSON to verify validity

---

### Test 9.2: Conversation File Format
**Objective**: Verify JSON structure matches schema

**Steps**:
1. Create conversation with multiple turns
2. Read conversation.json directly
3. Validate against ConversationSchema

**Expected Results**:
- JSON is well-formed
- All required fields present
- Types match schema
- Timestamps in ISO format
- Messages array properly structured

**Validation**:
- Parse JSON manually
- Verify against Zod schema structure
- Check field types and formats

---

## Test Suite 10: Performance and Limits

### Test 10.1: Long Query Handling
**Objective**: Verify system handles very long queries

**Steps**:
1. Create search with very long query (2000+ characters)
2. Follow-up with another long query

**Expected Results**:
- System handles long queries without truncation
- Conversation file properly stores full content
- No JSON parsing errors
- Response quality maintained

**Validation**:
- Verify full query stored in conversation
- Use `get_conversation_history` to verify content

---

### Test 10.2: Special Characters in Queries
**Objective**: Verify proper handling of special characters

**Steps**:
1. Create conversation with query containing:
   - Quotes: `"What is the meaning of "artificial intelligence"?"`
   - Newlines: `"Explain:\n1. AI\n2. ML\n3. DL"`
   - Unicode: `"Explain 人工智能 (artificial intelligence)"`

**Expected Results**:
- Special characters properly escaped in JSON
- Conversation file remains valid
- Queries preserved exactly as submitted
- Responses handle special characters correctly

**Validation**:
- Verify JSON validity
- Use `get_conversation_history` to check content preservation

---

## Test Execution Strategy

### Phase 1: Core Functionality (Test Suites 1-2)
- Verify basic conversation creation
- Verify same-mode follow-ups
- **Priority**: CRITICAL

### Phase 2: Advanced Features (Test Suites 3-4)
- Verify cross-mode functionality
- Verify multi-turn conversations
- **Priority**: HIGH

### Phase 3: Retrieval & Filtering (Test Suites 5-6)
- Verify history retrieval
- Verify search parameters
- **Priority**: HIGH

### Phase 4: Robustness (Test Suites 7-10)
- Verify error handling
- Verify concurrent usage
- Verify file system integration
- Verify performance limits
- **Priority**: MEDIUM

---

## Success Criteria

✅ **All test cases pass without errors**
✅ **Conversation files are valid JSON**
✅ **Context is maintained across turns**
✅ **Cross-mode functionality works seamlessly**
✅ **Error handling is graceful and informative**
✅ **File system organization is correct**
✅ **No data loss or corruption**
✅ **Performance is acceptable for typical use cases**

---

## Test Execution Notes

- Each test should be executed in order within its suite
- Document any unexpected behavior
- Save conversationIds for follow-up tests
- Check `conversation-logs/` directory periodically
- Monitor for any file system issues
- Verify log output for errors

---

## Post-Test Validation

After all tests:
1. Review `conversation-logs/` directory structure
2. Check for any orphaned files
3. Verify no temporary files left behind
4. Review error logs for any warnings
5. Verify .gitignore properly excludes conversation files
6. Check that test files in `test-conversation-logs/` are properly isolated