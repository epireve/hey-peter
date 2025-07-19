// Jest setup for testing environment
import '@testing-library/jest-dom';

// Mock sonner for toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

// Optional: Configure global test settings
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock ResizeObserver which is not available in jsdom
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver which is not available in jsdom
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia which is not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock pointer capture methods for Radix UI components
Element.prototype.hasPointerCapture = jest.fn();
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock HTMLElement.offsetHeight and offsetWidth
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: {
    get: () => 50,
  },
  offsetWidth: {
    get: () => 50,
  },
});

// Mock getBoundingClientRect
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 120,
  height: 120,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

// Mock PerformanceObserver which is not available in jsdom
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  supportedEntryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
}));

// Mock performance.getEntriesByType
global.performance.getEntriesByType = jest.fn().mockReturnValue([]);

// Mock performance.mark and measure
global.performance.mark = jest.fn();
global.performance.measure = jest.fn();
global.performance.clearMarks = jest.fn();
global.performance.clearMeasures = jest.fn();

// Mock crypto for Node.js environment
if (!global.crypto) {
  global.crypto = {
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  };
}

// Mock fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
}