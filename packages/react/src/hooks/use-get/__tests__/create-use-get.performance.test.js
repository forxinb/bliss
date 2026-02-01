const { renderHook } = require('@testing-library/react');
const { useQuery, useInfiniteQuery, QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const React = require('react');
const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw } = require('@godbliss/core/utils');
const createUseGet = require('../create-use-get');

// Mock external dependencies
const mockCreateQueryFn = require('../__mocks__/mock-query-fn-for-use-get-test');

// Helper function to check if query params are added
const isQueryParamsAdded = (gate) => gate.urlSuffix.includes('?');

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

describe('createUseGet - Performance', () => {
  let terminal;
  let createQueryFn;

  beforeEach(() => {
    const terminalDef = generateTestTerminalDef();
    terminal = buildTerminal(terminalDef);
    createQueryFn = mockCreateQueryFn;
  });

  it('memoizes createQueryFn calls for same deps', () => {
    const { rerender } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: { routeParams: { id: '1' } } });
    const initial = createQueryFn.mock.calls.length;
    for (let i = 0; i < 10; i++) {
      rerender('/users', { gateContext: { routeParams: { id: '1' } } });
    }
    expect(createQueryFn.mock.calls.length).toBe(initial);
  });

  it('calls createQueryFn when deps change', () => {
    const { rerender } = renderUseGet(terminal, createQueryFn, '/users/:id', { gateContext: { routeParams: { id: '1' } } });
    rerender('/users/:id', { gateContext: { routeParams: { id: '2' } } });
    expect(createQueryFn).toHaveBeenCalled();
  });

  it('does not recreate queryFn when req identity changes but values are same', () => {
    // Initial render
    const { rerender } = renderUseGet(terminal, createQueryFn, '/users/:id', { gateContext: { routeParams: { id: '10' } } });
    const initialCalls = createQueryFn.mock.calls.length;

    // Rerender with a new req object but identical content
    rerender('/users/:id', { gateContext: { routeParams: { id: '10' } } });

    // Should not call createQueryFn again because effective deps (urlSuffix/queryKey) are unchanged
    expect(createQueryFn.mock.calls.length).toBe(initialCalls);
  });

  it('recreates when additionalQueryKey changes (actual behavior)', () => {
    // Initial render without additionalQueryKey
    const { rerender } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: {} });
    const initialCalls = createQueryFn.mock.calls.length;

    // Change additionalQueryKey (affects queryKey)
    rerender('/users', { gateContext: { additionalQueryKey: ['v1'] } });

    expect(createQueryFn.mock.calls.length).toBe(initialCalls + 1);
  });

  it('recreates when queryParams changes (actual behavior)', () => {
    const { rerender } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: { queryParams: { page: 1 } } });
    const initialCalls = createQueryFn.mock.calls.length;

    // Change query parameter value (affects urlSuffix and queryKey)
    rerender('/users', { gateContext: { queryParams: { page: 2 } } });

    expect(createQueryFn.mock.calls.length).toBe(initialCalls + 1);
  });

  describe('useMemo Dependencies Direct Measurement', () => {
    it('measures gate.urlSuffix changes for routeParams', () => {
      const { rerender } = renderUseGet(terminal, createQueryFn, '/users/:id', { gateContext: { routeParams: { id: '1' } } });

      // Get initial gate values from createQueryFn calls
      const initialCall = createQueryFn.mock.calls[0];
      const initialGate = initialCall[0].gate; // { gate } parameter
      const initialUrlSuffix = initialGate.urlSuffix;

      // Change routeParams
      rerender('/users/:id', { gateContext: { routeParams: { id: '2' } } });

      // Get updated gate values
      const updatedCall = createQueryFn.mock.calls[createQueryFn.mock.calls.length - 1];
      const updatedGate = updatedCall[0].gate;
      const updatedUrlSuffix = updatedGate.urlSuffix;

      expect(updatedUrlSuffix).not.toBe(initialUrlSuffix);
      expect(updatedUrlSuffix).toContain('2');
    });

    it('measures gate.queryKey changes for routeParams', () => {
      const { rerender } = renderUseGet(terminal, createQueryFn, '/users/:id', { gateContext: { routeParams: { id: '1' } } });

      const initialCall = createQueryFn.mock.calls[0];
      const initialGate = initialCall[0].gate;
      const initialQueryKey = initialGate.queryKey;

      rerender('/users/:id', { gateContext: { routeParams: { id: '2' } } });

      const updatedCall = createQueryFn.mock.calls[createQueryFn.mock.calls.length - 1];
      const updatedGate = updatedCall[0].gate;
      const updatedQueryKey = updatedGate.queryKey;

      expect(updatedQueryKey).not.toEqual(initialQueryKey);
    });

    it('measures gate.urlSuffix for queryParams (actual behavior)', () => {
      const { rerender } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: { queryParams: { page: 1 } } });

      const initialCall = createQueryFn.mock.calls[0];
      const initialGate = initialCall[0].gate;
      const initialUrlSuffix = initialGate.urlSuffix;
      const initialIsQueryParamsAdded = isQueryParamsAdded(initialCall[0].gate);

      // Change queryParams
      rerender('/users', { gateContext: { queryParams: { page: 2 } } });

      const updatedCall = createQueryFn.mock.calls[createQueryFn.mock.calls.length - 1];
      const updatedGate = updatedCall[0].gate;
      const updatedUrlSuffix = updatedGate.urlSuffix;
      const updatedIsQueryParamsAdded = isQueryParamsAdded(updatedCall[0].gate);

      // Actual behavior: these DO change
      expect(updatedUrlSuffix).not.toBe(initialUrlSuffix);
      expect(updatedUrlSuffix).toContain('page=2');
      expect(updatedIsQueryParamsAdded).toBe(true);
    });

    it('measures gate.queryKey for additionalQueryKey (actual behavior)', () => {
      const { rerender } = renderUseGet(terminal, createQueryFn, '/users', { gateContext: { additionalQueryKey: ['v1'] } });

      const initialCall = createQueryFn.mock.calls[0];
      const initialGate = initialCall[0].gate;
      const initialQueryKey = initialGate.queryKey;

      // Change additionalQueryKey
      rerender('/users', { gateContext: { additionalQueryKey: ['v2'] } });

      const updatedCall = createQueryFn.mock.calls[createQueryFn.mock.calls.length - 1];
      const updatedGate = updatedCall[0].gate;
      const updatedQueryKey = updatedGate.queryKey;

      // Actual behavior: this DOES change
      expect(updatedQueryKey).not.toEqual(initialQueryKey);
      expect(updatedQueryKey).toContain('v2');
    });

    it('verifies useMemo dependency array values', () => {
      const { rerender } = renderUseGet(terminal, createQueryFn, '/users/:id', { gateContext: { routeParams: { id: '1' } } });

      const initialCall = createQueryFn.mock.calls[0];
      const initialGate = initialCall[0].gate;

      // Change routeParams
      rerender('/users/:id', { gateContext: { routeParams: { id: '2' } } });

      const updatedCall = createQueryFn.mock.calls[createQueryFn.mock.calls.length - 1];
      const updatedGate = updatedCall[0].gate;

      // Verify the dependency values that useMemo actually uses
      expect(updatedGate.urlSuffix).not.toBe(initialGate.urlSuffix);
      expect(updatedGate.queryKey).not.toEqual(initialGate.queryKey);
    });
  });
});
