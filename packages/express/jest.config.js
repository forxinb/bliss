// Jest configuration for MongoDB utilities tests

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/test-utils/**',
    '!src/**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 15000, // MongoDB operations might take time
  verbose: true,
  forceExit: true, // Force exit
  maxWorkers: 1, // Run with single worker
  runInBand: true // Run sequentially for stability
};
