const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  // Add setup file for jest-dom and other testing util extensions
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Use jsdom test environment for React components
  testEnvironment: 'jest-environment-jsdom',
  // Support absolute imports like "@/..."
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Collect coverage only from application code
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
  ],
  // Coverage thresholds for quality assurance
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);