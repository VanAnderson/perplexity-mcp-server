/**
 * @fileoverview Shared constants used across Perplexity MCP tool registrations.
 * @module src/mcp-server/tools/shared-constants
 */

import { config } from '../../config/index.js';

/**
 * Security and privacy disclaimer text for Perplexity query tools.
 * 
 * This disclaimer warns users that queries are sent to Perplexity's external API
 * and should not contain sensitive, proprietary, or codebase-specific information.
 */
const SECURITY_DISCLAIMER_TEXT = 
  "**SECURITY NOTICE:** Perplexity is an external third-party service. Do NOT include sensitive, proprietary, or codebase-specific details in your queries. When formulating queries, use one of these strategies: (1) **Generalize**: Focus on broader concepts rather than your specific implementation (e.g., ask about 'JWT authentication best practices in Node.js' instead of describing your exact auth system). (2) **Anonymize & Decontextualize**: If you need to share specific code or context, create an illustrative example that captures the technical essence while removing all identifying details—use placeholder names like 'MyService' or 'UserController', generic variable names, and sanitized data structures. **CRITICAL:** Never include real API keys, tokens, passwords, internal URLs, or proprietary algorithms. Replace with clearly fake values (e.g., 'sk_test_abc123...' or 'REDACTED_API_KEY'). Treat every query as if posting to a public forum like Stack Overflow.";

/**
 * Returns the security disclaimer if enabled via the PERPLEXITY_ENABLE_SECURITY_DISCLAIMER environment variable.
 * Otherwise returns an empty string.
 * 
 * Set PERPLEXITY_ENABLE_SECURITY_DISCLAIMER=true in your .env file to enable the security disclaimer
 * for sensitive work contexts where queries should be generalized or anonymized.
 * 
 * @returns The security disclaimer text if enabled, otherwise an empty string
 */
export function getSecurityDisclaimer(): string {
  return config.perplexityEnableSecurityDisclaimer ? SECURITY_DISCLAIMER_TEXT : "";
}

