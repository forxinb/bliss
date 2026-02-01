const { renderHook } = require('@testing-library/react');
const { useQuery, useInfiniteQuery, QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const React = require('react');
const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw } = require('@godbliss/core/utils');
const createUseGet = require('../create-use-get');

// Mock external dependencies
const mockCreateQueryFn = require('../__mocks__/mock-query-fn-for-use-get-test');

const generateTestTerminalDef = (overrides = {}) => ({
  gateDefs: {
    '/users': {
      '': { GET: { path: '/users', method: 'GET' } },
      '/:id': { GET: { path: '/users/:id', method: 'GET' } }
    },
    '/posts': {
      '': { GET: { path: '/posts', method: 'GET' } }
    }
  },
  errorDefs: { request: { bad: { code: 400 } } },
  successDefs: { response: { ok: { code: 200 } } },
  ...overrides,
});

const buildTerminal = (terminalDef) => ({
  gateDefs: gateDefsFromRaw(terminalDef.gateDefs),
  errorDefs: errorDefsFromRaw(terminalDef.errorDefs || {}),
  successDefs: successDefsFromRaw(terminalDef.successDefs || {}),
});

const renderUseGet = (terminal, createQueryFn, path, params = {}) => {
  const useGet = createUseGet({ terminalDef: terminal, createQueryFn, useQuery, useInfiniteQuery });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }) => React.createElement(
    QueryClientProvider,
    { client: queryClient },
    children
  );

  const rendered = renderHook(
    ({ path, params }) => useGet(path, params),
    { wrapper, initialProps: { path, params } }
  );
  const rerender = (nextPath, nextParams = {}) => {
    rendered.rerender({ path: nextPath, params: nextParams });
  };
  return { ...rendered, rerender };
};

describe('createUseGet - Render & Re-render', () => {
  let terminal;
  let createQueryFn;

  beforeEach(() => {
    terminal = buildTerminal(generateTestTerminalDef());
    createQueryFn = mockCreateQueryFn;
  });

  it('renders without errors', () => {
    const { result } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: {} });
    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBe(true); // React Query v5 behavior
  });

  it('handles different paths', () => {
    const { result: result1 } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: {} });
    const { result: result2 } = renderUseGet(terminal, createQueryFn, '/posts', { gateContext: {} });

    expect(result1.current).toBeDefined();
    expect(result2.current).toBeDefined();
  });
});
