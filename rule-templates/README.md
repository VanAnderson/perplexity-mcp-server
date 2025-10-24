# Rule Templates for Kilo Code AI Assistant

This directory contains rule templates that can be used to configure AI assistants working with codebases. These templates are designed to be copied into project-specific `.kilocode/rules/` directories and customized as needed.

## Available Templates

### [`perplexity-research-best-practices.md`](perplexity-research-best-practices.md)

**Purpose:** Encourages AI assistants to leverage Perplexity's search and deep research capabilities for expert information, difficult debugging, framework knowledge, and complex tasks.

**Key Features:**
- Guidelines for when to use quick search vs. deep research
- Best practices for writing effective search queries
- Follow-up query strategies and cross-mode transitions
- Context preservation patterns during conversation summarization
- Decision trees and practical examples
- Integration patterns with different AI modes (Code, Debug, Architect, Ask)

**When to Use This Rule:**
- Projects where current/expert information is frequently needed
- Complex technical domains requiring specialized knowledge
- Debugging scenarios needing framework-specific expertise
- Architectural decisions requiring comprehensive research

**Research Source:** Based on Perplexity conversation `20251024-1761346195407` covering best practices for AI assistant rules and external knowledge sources.

## How to Use These Templates

### 1. Copy to Your Project

```bash
# Create rules directory if it doesn't exist
mkdir -p .kilocode/rules

# Copy the template you want
cp rule-templates/perplexity-research-best-practices.md .kilocode/rules/
```

### 2. Customize for Your Project

Edit the copied rule to:
- Add project-specific examples
- Adjust guidelines based on your technology stack
- Modify emphasis based on your team's needs
- Add domain-specific guidance

### 3. Reference in Your Kilocode Configuration

The AI assistant will automatically detect and apply rules from `.kilocode/rules/`.

## Template Structure

Each template follows this structure:

1. **Context** - What the rule is for
2. **Core Principle** - The fundamental guideline
3. **When to Use** - Specific scenarios and triggers
4. **Best Practices** - Actionable guidelines with examples
5. **Patterns** - Common usage patterns and workflows
6. **Examples** - Concrete use cases (good and bad)
7. **Success Metrics** - How to know it's working

## Contributing New Templates

When creating new rule templates:

1. **Research First** - Use Perplexity to research best practices
2. **Document Source** - Include conversation ID for research transparency
3. **Be Specific** - Provide concrete examples, not just theory
4. **Show Trade-offs** - Explain when NOT to use the pattern
5. **Test Thoroughly** - Verify the rule improves AI assistant behavior

### Template Format

```markdown
# Rule Name

**Context:** [What this rule is for]

**Conversation ID for this research:** `YYYYMMDD-[timestamp]` ([Brief description])

---

## Core Principle

[Fundamental guideline]

---

## When to Use [Tool/Pattern]

[Specific scenarios with ✅ checkmarks]

## Best Practices

[Actionable guidelines with examples]

## Examples

### ✅ Good Examples
[Concrete examples]

### ❌ Poor Examples
[Anti-patterns]

---

## Summary

[Key takeaway]
```

## Version History

- **v1.0.0** (2025-10-24) - Initial template collection with Perplexity research best practices

## License

These templates are part of the Perplexity MCP Server project and are provided under the same license as the main project.