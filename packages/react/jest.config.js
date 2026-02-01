module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.js'],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'json', 'mjs'],
  
  // Transform files - don't transform .mjs files, let Jest handle them natively
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  
  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
  ],
  
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/setup-tests.js'
  ],
  
  // Don't transform any node_modules except specific ES modules
  transformIgnorePatterns: [
    'node_modules/(?!bson)'
  ],
  
  // Module name mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^bson$': '<rootDir>/../../node_modules/.pnpm/bson@6.10.4/node_modules/bson/lib/bson.cjs'
  },
  
  // Experimental ESM support
  preset: null
};
