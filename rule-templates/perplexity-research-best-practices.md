# Perplexity Research Best Practices

**Context:** This rule encourages AI assistants to leverage Perplexity's search and deep research capabilities for expert information, difficult debugging, framework knowledge, and complex tasks.

**Conversation ID for this research:** `20251024-1761346195407` (Best practices for AI assistant rules and external knowledge sources)

---

## Core Principle

**Leverage external expertise liberally.** When you encounter questions requiring current information, specialized knowledge, or deep domain expertise, use Perplexity tools to access expert-level research rather than relying solely on training data.

---

## When to Use Perplexity Search (`perplexity_search`)

Use **quick search** for:

✅ **Current Information Needs**
- Latest framework versions, API changes, or library updates
- Recent best practices or architectural patterns
- Current security vulnerabilities or patches
- Technology comparisons and benchmarks

✅ **Specific Framework/Technology Knowledge**
- Implementation patterns for specific frameworks (React, Next.js, TypeScript, etc.)
- Configuration examples and common gotchas
- Integration approaches between technologies
- Performance optimization techniques

✅ **Debugging Difficult Issues**
- Error messages you haven't encountered before
- Framework-specific bugs or known issues
- Platform-specific behavior or limitations
- Stack trace interpretation for complex scenarios

✅ **Expert Opinions & Industry Standards**
- Community consensus on approaches
- Industry best practices for specific domains
- Regulatory or compliance requirements
- Architecture decision records from real-world implementations

### Search Query Best Practices

Write **complete, grammatically correct sentences with full context**:

❌ **Bad:** "latest Next.js features"
✅ **Good:** "What are the most significant new features in Next.js 15 released in 2024, particularly for server components and caching?"

❌ **Bad:** "debug TypeScript error"
✅ **Good:** "How do I resolve TypeScript error TS2345 'Argument of type X is not assignable to parameter of type Y' when using Zod schema validation in a Next.js API route?"

---

## When to Use Deep Research (`perplexity_deep_research`)

Use **deep research** for:

✅ **Large Implementation Efforts**
- Planning major architectural changes
- Evaluating multiple technology options
- Understanding complex system integrations
- Comprehensive security or performance audits

✅ **Complex Technical Decisions**
- Choosing between competing frameworks or libraries
- Evaluating trade-offs for architectural patterns
- Understanding implications of technology choices
- Compliance or regulatory research

✅ **Systematic Problem Investigation**
- Root cause analysis for persistent issues
- Performance bottleneck identification across stack
- Security vulnerability assessment
- Multi-faceted debugging requiring expert knowledge

✅ **Domain-Specific Deep Dives**
- Medical, legal, or scientific domain knowledge
- Industry-specific regulations or standards
- Historical context for technical decisions
- Academic research on algorithms or approaches

### Deep Research Query Best Practices

Provide **structured, comprehensive context** as a markdown document:

```markdown
# Research Objective
[What you're trying to accomplish]

# Background Context
[Relevant technologies, versions, current situation]

# Specific Questions
1. [Question 1]
2. [Question 2]
3. [Question 3]

# Requirements
- [Requirement 1]
- [Requirement 2]

# Intended Use Case
[How you'll apply this research]
```

**Example:**
```markdown
# Research Objective
Comprehensive analysis of conversation persistence patterns for AI chat systems

# Background Context
Building a Model Context Protocol (MCP) server using @modelcontextprotocol/sdk v1.15.0 in TypeScript/Node.js. System handles AI search conversations that need to maintain context across multiple follow-up queries.

# Specific Questions
1. What are proven patterns for conversation storage (file-based vs database)?
2. How should conversation IDs be structured for scalability?
3. What are best practices for cross-mode conversation transitions?
4. How should conversation history be exposed to users and AI agents?

# Requirements
- Must support both stdio and HTTP transports
- TypeScript with Zod schema validation
- File-based storage preferred for simplicity
- Need comprehensive error handling

# Intended Use Case
Production MCP server enabling AI assistants to maintain research conversations across sessions
```

---

## Follow-up Query Strategy

**Always prefer follow-ups** over starting new conversations when:

- Clarifying details from previous research
- Going deeper on specific aspects of a topic
- Exploring alternative approaches from same context
- Asking "how" after understanding "what"

### Using Follow-up Tools

**Quick clarifications:** `perplexity_search_followup`
```json
{
  "conversationId": "20251024-1761346195407",
  "query": "Which of these approaches has the lowest latency overhead?"
}
```

**Deeper investigation:** `perplexity_deep_research_followup`
```json
{
  "conversationId": "20251024-1761346195407",
  "query": "Provide comprehensive analysis of the ACAR framework mentioned, including implementation steps and real-world case studies",
  "reasoning_effort": "high"
}
```

---

## Cross-Mode Transitions

**Strategically switch between search and deep research** within the same conversation:

### Pattern 1: Quick Facts → Deep Dive
```
1. perplexity_search: "What is the ACAR framework for algorithmic bias?"
2. perplexity_deep_research_followup: "Comprehensive guide to implementing ACAR framework in healthcare AI systems"
```

### Pattern 2: Deep Research → Targeted Follow-ups
```
1. perplexity_deep_research: [Comprehensive research on AI ethics frameworks]
2. perplexity_search_followup: "What are the current FDA regulations mentioned in the ACAR framework?"
3. perplexity_search_followup: "Which organizations have successfully implemented IEEE 7003-2024?"
```

### Pattern 3: Initial Questions → Informed Deep Dive
```
1. perplexity_search: "What is Zod schema validation?"
2. perplexity_search_followup: "Common patterns for Zod in TypeScript APIs"
3. perplexity_deep_research_followup: "Comprehensive guide to Zod schema validation architecture for production TypeScript API with error handling, type inference, and runtime validation best practices"
```

---

## Context Preservation During Summarization

When conversations are summarized or context is condensed, **always preserve**:

### 1. Conversation ID
```
Research conversation: `20251024-1761346195407`
```

### 2. Topic Summary
```
Topic: Best practices for AI assistant rules and external knowledge source integration
```

### 3. Retrieval Instructions
```
Full details: Use `get_conversation_history` with conversation ID `20251024-1761346195407`
```

### 4. Key Findings (Brief)
```
Key insights:
- Use internal knowledge first, external sources only when needed
- Structure queries with complete context and specific questions
- Implement RBAC for knowledge source access
- Use follow-ups to maintain conversation continuity
```

### Complete Preservation Template
```markdown
## Research Context Preserved

**Conversation ID:** `20251024-1761346195407`

**Topic:** [Brief description]

**Key Findings:**
- [Finding 1]
- [Finding 2]
- [Finding 3]

**To retrieve full details:** Use `get_conversation_history` with conversation ID above, or continue research with `perplexity_search_followup` or `perplexity_deep_research_followup`.
```

---

## Practical Decision Tree

```
┌─ Need expert information? ──────────────────────────┐
│                                                      │
├─ YES → Is it a quick factual question?              │
│   ├─ YES → perplexity_search                       │
│   └─ NO → Is it complex/multi-faceted?             │
│       ├─ YES → perplexity_deep_research            │
│       └─ MAYBE → Start with search, follow up      │
│                  with deep research if needed       │
│                                                      │
├─ Have existing conversation ID?                     │
│   ├─ YES → Use followup tools                      │
│   │   ├─ Quick clarification? →                    │
│   │   │   perplexity_search_followup               │
│   │   └─ Deep dive? →                              │
│   │       perplexity_deep_research_followup        │
│   └─ NO → Start new conversation                   │
│                                                      │
└─ Always preserve conversation ID in context! ───────┘
```

---

## Examples of When to Use Perplexity

### ✅ Excellent Use Cases

**Debugging:**
```
"How do I resolve the error 'Cannot find module @modelcontextprotocol/sdk/server/mcp.js' when using ES modules in Node.js 18 with TypeScript 5.8, where tsconfig has 'module': 'ESNext' and 'moduleResolution': 'bundler'?"
```

**Framework Knowledge:**
```
"What are the best practices for implementing request context propagation in TypeScript/Node.js applications using the Model Context Protocol SDK v1.15+, including patterns for logging, error handling, and unique request ID generation?"
```

**Architecture Decisions:**
```markdown
# Research Objective
Determine optimal conversation persistence architecture for MCP server

# Background
- TypeScript MCP server
- File-based storage requirement
- Need conversation continuation across sessions
- Must support stdio and HTTP transports

# Questions
1. File structure patterns for conversation logs?
2. ID generation strategies for conversations?
3. How to handle concurrent conversation updates?
4. Best practices for conversation history retrieval?
```

**Current Best Practices:**
```
"What are the current industry best practices for error handling in TypeScript services as of 2024-2025, specifically for centralized error processing, error code standardization, and context preservation through error chains?"
```

### ❌ Poor Use Cases

**Don't use for:**
- Simple code syntax questions answerable from training data
- Basic language features well-documented in your knowledge
- Questions about code you just wrote (analyze it yourself first)
- Requests that don't benefit from current/expert information

---

## Integration with Other Modes

### When in Code Mode
- Use Perplexity for **framework-specific patterns** before implementing
- Research **error messages** you encounter during development
- Verify **best practices** for technologies you're using
- Look up **API documentation** for current versions

### When in Debug Mode
- Research **error patterns** and known issues
- Find **troubleshooting guides** for specific frameworks
- Investigate **performance issues** with expert analysis
- Discover **debugging techniques** for specific scenarios

### When in Architect Mode
- Deep research for **architectural patterns**
- Compare **technology options** comprehensively
- Understand **scalability implications**
- Research **industry standards** and regulations

### When in Ask Mode
- Use search for **quick factual questions**
- Follow up with **clarifying questions**
- Deep research for **comprehensive explanations**
- Preserve conversation IDs for **future reference**

---

## Reasoning Effort Selection

For `perplexity_deep_research` and `perplexity_deep_research_followup`:

**`reasoning_effort: "low"`** (faster, cheaper)
- Quick overviews of well-known topics
- Straightforward questions with clear answers
- Time-sensitive queries

**`reasoning_effort: "medium"`** (default, balanced)
- Most research tasks
- Moderate complexity questions
- Standard architectural decisions

**`reasoning_effort: "high"`** (thorough, slower, more expensive)
- Critical architectural decisions
- Complex multi-faceted problems
- Safety/security/compliance research
- Novel or cutting-edge topics requiring deep analysis

---

## Success Metrics

You're using Perplexity effectively when:

✅ You access current information unavailable in training data
✅ You leverage expert knowledge for specialized domains
✅ You maintain conversation continuity with follow-ups
✅ You preserve conversation IDs during context condensing
✅ You switch between search/deep research appropriately
✅ You provide complete context in queries
✅ You save research conversations for future reference

---

## Common Patterns

### Pattern: "Learn then Apply"
```
1. perplexity_search: Learn about technology/pattern
2. perplexity_search_followup: Clarify specific details
3. Apply knowledge to implement solution
4. If issues arise → perplexity_search_followup with error details
```

### Pattern: "Research then Decide"
```
1. perplexity_deep_research: Comprehensive analysis of options
2. Review findings and identify trade-offs
3. perplexity_search_followup: Clarify specific concerns
4. Make informed decision with expert backing
```

### Pattern: "Debug with Expert Help"
```
1. Attempt to debug using available knowledge
2. If stuck → perplexity_search with complete error context
3. perplexity_search_followup: Clarify suggested solutions
4. Apply fix and verify
5. If deeper issues → perplexity_deep_research_followup
```

### Pattern: "Continuous Learning"
```
1. Start research conversation on broad topic
2. Use search_followup for targeted questions
3. Preserve conversation ID in context summary
4. Return to conversation later with new questions
5. Use get_conversation_history to review previous findings
```

---

## Summary

**Default to expertise.** When uncertain, use Perplexity. When complex, use deep research. When continuing a topic, use follow-ups. Always preserve conversation IDs. This approach ensures you deliver solutions backed by current expert knowledge rather than potentially outdated training data.

**Remember:** The goal is not to avoid using Perplexity—it's to use it strategically to provide the best possible assistance backed by expert-level research and current information.