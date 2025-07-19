const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@supabase/auth-helpers-nextjs': '<rootDir>/src/lib/__mocks__/supabase.js',
    '@supabase/supabase-js': '<rootDir>/src/lib/__mocks__/supabase.js',
    '^@/lib/supabase$': '<rootDir>/src/lib/__mocks__/supabase.js',
    '^@/lib/supabase-server$': '<rootDir>/src/lib/__mocks__/supabase.js',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Increase timeout for slower tests
  testTimeout: 15000,
  // Add more detailed error output
  verbose: true,
  // Handle memory issues
  maxWorkers: '50%',
  // Add setup for async tests
  setupFiles: ['<rootDir>/jest.polyfills.js'],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);