import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

// Extend vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Set up MSW server for API mocking
export const server = setupServer(...handlers);

// Start the MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset any runtime request handlers after each test
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Clean up after all tests are done
afterAll(() => server.close());

// Mock IndexedDB
class MockIDBFactory {
  open() {
    return {
      result: {},
      addEventListener: () => {},
    };
  }
}

Object.defineProperty(window, 'indexedDB', {
  value: new MockIDBFactory(),
});

// Mock WebWorker
class MockWorker {
  constructor() {}
  addEventListener() {}
  postMessage() {}
  terminate() {}
}

// @ts-ignore
global.Worker = MockWorker;

// Mock crypto
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => '00000000-0000-0000-0000-000000000000',
    getRandomValues: (arr: Uint8Array) => arr,
  },
});

// Mock console methods to track their calls
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Replace console methods with mocked versions that still pass through to original
console.error = vi.fn((...args) => {
  originalConsoleError(...args);
});

console.warn = vi.fn((...args) => {
  originalConsoleWarn(...args);
});

console.log = vi.fn((...args) => {
  originalConsoleLog(...args);
});