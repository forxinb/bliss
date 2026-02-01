// Mock useGet hook created by createUseGet for testing use-get hook
const createUseGet = require('../create-use-get');
const mockTerminal = require('./mock-terminal-for-use-get-test');
const mockCreateQueryFn = require('./mock-query-fn-for-use-get-test');
// Note: In a real test environment, react-query hooks should be mocked or provided via QueryClientProvider
const { useQuery, useInfiniteQuery } = require('@tanstack/react-query');

// Create actual useGet using createUseGet with mocked dependencies
const useGet = createUseGet({
  terminalDef: mockTerminal,
  createQueryFn: mockCreateQueryFn,
  useQuery,
  useInfiniteQuery
});

module.exports = useGet;
