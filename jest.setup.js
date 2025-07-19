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
global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
  const mockObserver = {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    supportedEntryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
  };
  
  // Allow manual triggering of callbacks for testing
  mockObserver.triggerCallback = (entries) => {
    if (callback && typeof callback === 'function') {
      callback({
        getEntries: () => entries || [],
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift']
      });
    }
  };
  
  return mockObserver;
});

// Mock performance.getEntriesByType
global.performance.getEntriesByType = jest.fn().mockReturnValue([]);

// Mock performance.mark and measure
global.performance.mark = jest.fn();
global.performance.measure = jest.fn();
global.performance.clearMarks = jest.fn();
global.performance.clearMeasures = jest.fn();

// Mock performance.now for consistent timing in tests
global.performance.now = jest.fn(() => Date.now());

// Mock performance.timeOrigin
Object.defineProperty(global.performance, 'timeOrigin', {
  value: Date.now(),
  writable: false,
  configurable: true,
});

// Mock performance.navigation
global.performance.navigation = {
  type: 0,
  redirectCount: 0
};

// Mock performance.timing
global.performance.timing = {
  navigationStart: Date.now(),
  unloadEventStart: 0,
  unloadEventEnd: 0,
  redirectStart: 0,
  redirectEnd: 0,
  fetchStart: Date.now(),
  domainLookupStart: Date.now(),
  domainLookupEnd: Date.now(),
  connectStart: Date.now(),
  connectEnd: Date.now(),
  secureConnectionStart: 0,
  requestStart: Date.now(),
  responseStart: Date.now(),
  responseEnd: Date.now(),
  domLoading: Date.now(),
  domInteractive: Date.now(),
  domContentLoadedEventStart: Date.now(),
  domContentLoadedEventEnd: Date.now(),
  domComplete: Date.now(),
  loadEventStart: Date.now(),
  loadEventEnd: Date.now()
};

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
      statusText: 'OK',
      headers: new Headers(),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: jest.fn(),
    })
  );
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 0);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((cb) => {
  setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);
  return 1;
});

global.cancelIdleCallback = jest.fn();

// Mock Navigation API
global.Navigation = jest.fn();
global.navigation = {
  navigate: jest.fn(),
  reload: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  canGoBack: false,
  canGoForward: false,
  currentEntry: {
    url: 'http://localhost:3000',
    key: 'test-key',
    id: 'test-id',
    index: 0,
    sameDocument: true,
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

// Mock AbortController
if (!global.AbortController) {
  global.AbortController = class {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }
    abort() {
      this.signal.aborted = true;
    }
  };
}

// Mock Headers
if (!global.Headers) {
  global.Headers = class {
    constructor(init) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }
    
    get(name) {
      return this._headers.get(name.toLowerCase());
    }
    
    set(name, value) {
      this._headers.set(name.toLowerCase(), String(value));
    }
    
    has(name) {
      return this._headers.has(name.toLowerCase());
    }
    
    delete(name) {
      this._headers.delete(name.toLowerCase());
    }
    
    forEach(callback) {
      this._headers.forEach((value, key) => callback(value, key, this));
    }
    
    entries() {
      return this._headers.entries();
    }
    
    keys() {
      return this._headers.keys();
    }
    
    values() {
      return this._headers.values();
    }
  };
}

// Mock Blob
if (!global.Blob) {
  global.Blob = class {
    constructor(parts = [], options = {}) {
      this.size = 0;
      this.type = options.type || '';
      if (parts.length) {
        this.size = parts.reduce((total, part) => {
          return total + (typeof part === 'string' ? part.length : part.byteLength || 0);
        }, 0);
      }
    }
    
    slice() {
      return new Blob();
    }
    
    stream() {
      return new ReadableStream();
    }
    
    text() {
      return Promise.resolve('');
    }
    
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(0));
    }
  };
}

// Mock File
if (!global.File) {
  global.File = class extends Blob {
    constructor(parts, name, options = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

// Mock ReadableStream
if (!global.ReadableStream) {
  global.ReadableStream = class {
    constructor() {
      this.locked = false;
    }
    
    getReader() {
      return {
        read: () => Promise.resolve({ done: true, value: undefined }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };
    }
    
    cancel() {
      return Promise.resolve();
    }
  };
}