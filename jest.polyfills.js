/**
 * Jest Polyfills
 * 
 * Provides polyfills for browser APIs that may not be available in Node.js test environment
 */

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for structuredClone if not available
if (!global.structuredClone) {
  global.structuredClone = (obj) => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      // Fallback for circular references or complex objects
      return obj;
    }
  };
}

// Polyfill for setImmediate
if (!global.setImmediate) {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
  global.clearImmediate = (id) => clearTimeout(id);
}

// Environment variables for tests
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// Suppress console warnings during tests (uncomment if needed)
// const originalConsoleWarn = console.warn;
// console.warn = (...args) => {
//   if (args[0]?.includes?.('Warning: An update to') && args[0]?.includes?.('inside a test was not wrapped in act')) {
//     return;
//   }
//   originalConsoleWarn(...args);
// };