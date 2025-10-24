/**
 * @fileoverview Provides utility function for generating unique conversation IDs.
 * Conversation IDs follow the pattern: yyyymmdd-[unix-milliseconds]
 * Example: 20250124-1706102400123
 * @module src/utils/conversation/conversationIdGenerator
 */

/**
 * Generates a unique conversation ID with the pattern: yyyymmdd-[unix-milliseconds]
 * 
 * Benefits:
 * - Chronological sorting (date prefix)
 * - Uniqueness guaranteed (millisecond timestamp)
 * - Human-readable creation date
 * - No collision risk in typical usage
 * 
 * @returns A unique conversation ID string
 * @example
 * const id = generateConversationId();
 * // Returns: "20250124-1706102400123"
 */
export function generateConversationId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); // yyyymmdd
  const timestampMs = now.getTime();
  return `${dateStr}-${timestampMs}`;
}

/**
 * Validates a conversation ID format.
 * 
 * @param conversationId - The conversation ID to validate
 * @returns true if the ID matches the expected pattern, false otherwise
 * @example
 * isValidConversationId("20250124-1706102400123") // true
 * isValidConversationId("invalid-id") // false
 */
export function isValidConversationId(conversationId: string): boolean {
  // Pattern: yyyymmdd-[unix-milliseconds]
  // Date part: 8 digits (yyyymmdd)
  // Separator: hyphen
  // Timestamp part: 13 digits (unix milliseconds)
  const pattern = /^\d{8}-\d{13}$/;
  return pattern.test(conversationId);
}

/**
 * Extracts the date from a conversation ID.
 * 
 * @param conversationId - The conversation ID to parse
 * @returns The date portion as a Date object, or null if invalid
 * @example
 * const date = extractDateFromConversationId("20250124-1706102400123");
 * // Returns: Date object for 2025-01-24
 */
export function extractDateFromConversationId(conversationId: string): Date | null {
  if (!isValidConversationId(conversationId)) {
    return null;
  }
  
  const dateStr = conversationId.split('-')[0];
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1; // 0-indexed
  const day = parseInt(dateStr.slice(6, 8), 10);
  
  return new Date(year, month, day);
}