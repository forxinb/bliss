const { renderHook } = require('@testing-library/react');
const { useQuery, useInfiniteQuery, QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const React = require('react');
const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw, makeSchema } = require('@godbliss/core/utils');
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

  return renderHook(
    ({ path, params }) => useGet(path, params),
    { wrapper, initialProps: { path, params } }
  );
};

describe('createUseGet - Integration', () => {
  let terminal;
  let createQueryFn;

  beforeEach(() => {
    terminal = buildTerminal(generateTestTerminalDef());
    createQueryFn = mockCreateQueryFn;
  });

  it('works with real MobX-like environment (shape assertions)', () => {
    renderUseGet(terminal, createQueryFn, '/users', { gateContext: {} });
    expect(createQueryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        gate: expect.objectContaining({
          urlSuffix: expect.any(String),
          queryKey: expect.any(Array),
          form: expect.any(Object),
        }),
        customQueryClient: undefined
      })
    );
  });

  it('passes schema through gate', () => {
    const schema = makeSchema({ name: { type: String, required: true } });
    const terminalWithSchema = buildTerminal(generateTestTerminalDef({
      gateDefs: { '/users': { '': { GET: { path: '/users', method: 'GET', schema } } } }
    }));
    renderUseGet(terminalWithSchema, createQueryFn, '/users', { gateContext: {} });
    expect(createQueryFn).toHaveBeenCalledWith(
      expect.objectContaining({
        gate: expect.objectContaining({
          schema,
          form: expect.any(Object),
          urlSuffix: expect.any(String),
          queryKey: expect.any(Array)
        }),
        customQueryClient: undefined
      })
    );
  });
});
