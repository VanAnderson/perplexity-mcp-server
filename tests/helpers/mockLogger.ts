/**
 * Mock logger for testing
 * Provides jest.fn() mocks for all logger methods
 */

// Create a function that returns a jest.fn() or a no-op function
const createMockFn = () => {
  // In test environment, jest will be available
  if (typeof jest !== 'undefined') {
    return jest.fn();
  }
  // Fallback for module load time
  const fn: any = () => {};
  fn.mockClear = () => {};
  fn.mockReset = () => {};
  fn.mockRestore = () => {};
  return fn;
};

export const mockLogger = {
  debug: createMockFn(),
  info: createMockFn(),
  notice: createMockFn(),
  warning: createMockFn(),
  error: createMockFn(),
  crit: createMockFn(),
  alert: createMockFn(),
  emerg: createMockFn(),
  fatal: createMockFn(),
  logInteraction: createMockFn(),
  initialize: createMockFn(),
  setLevel: createMockFn(),
  setMcpNotificationSender: createMockFn(),
};

/**
 * Reset all logger mocks
 */
export const resetMockLogger = () => {
  Object.values(mockLogger).forEach((fn) => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
};