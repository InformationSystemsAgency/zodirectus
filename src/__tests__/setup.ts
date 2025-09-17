// Test setup file
import 'jest';

// Mock console methods to reduce noise in tests
const mockFn = () => {};
global.console = {
  ...console,
  log: mockFn,
  debug: mockFn,
  info: mockFn,
  warn: mockFn,
  error: mockFn,
};
