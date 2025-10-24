/**
 * Barrel export for perplexity_deep_research_followup tool.
 */

export { registerPerplexityDeepResearchFollowup } from './registration.js';
export { 
  perplexityDeepResearchFollowupLogic,
  PerplexityDeepResearchFollowupInputSchema,
  PerplexityDeepResearchFollowupResponseSchema,
  type PerplexityDeepResearchFollowupInput,
  type PerplexityDeepResearchFollowupResponse,
} from './logic.js';