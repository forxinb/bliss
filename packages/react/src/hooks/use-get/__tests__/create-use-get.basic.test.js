const { useQuery, useInfiniteQuery, QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { renderHook } = require('@testing-library/react');
const React = require('react');
const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw } = require('@godbliss/core/utils');
const createUseGet = require('../create-use-get');

// Mock external dependencies
const mockTerminal = require('../__mocks__/mock-terminal-for-use-get-test');
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

describe('createUseGet - Basic & Hook Rules', () => {
  let terminal;
  let createQueryFn;
  let queryClient;

  beforeEach(() => {
    terminal = buildTerminal(generateTestTerminalDef());
    createQueryFn = mockCreateQueryFn;
    createQueryFn.mockClear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  it('creates useGet', () => {
    const useGet = createUseGet({ terminalDef: terminal, createQueryFn, useQuery, useInfiniteQuery });
    expect(typeof useGet).toBe('function');
  });

  it('throws when terminalDef is missing', () => {
    expect(() => createUseGet({ createQueryFn: jest.fn(), useQuery, useInfiniteQuery })).toThrow('terminalDef is required');
  });

  it('throws when createQueryFn is missing', () => {
    expect(() => createUseGet({ terminalDef: terminal, useQuery, useInfiniteQuery })).toThrow('createQueryFn is required');
  });

  it('throws when useQuery is missing', () => {
    expect(() => createUseGet({ terminalDef: terminal, createQueryFn })).toThrow('useQuery is required');
  });

  it('throws when useInfiniteQuery is missing', () => {
    expect(() => createUseGet({ terminalDef: terminal, createQueryFn, useQuery })).toThrow('useInfiniteQuery is required');
  });

  it('supports terminalDef as object', () => {
    const useGet = createUseGet({ terminalDef: terminal, createQueryFn, useQuery, useInfiniteQuery });
    expect(typeof useGet).toBe('function');
  });
});
