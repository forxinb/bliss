const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider, useMutation, useQueryClient } = require('@tanstack/react-query');
const createUseGateAction = require('../create-use-gate-action');
const { actionDefs, terminalDef } = require('../__mocks__/gate-action-defs');

// QueryClient for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

// Test wrapper component
const TestWrapper = ({ children, queryClient }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Mock functions
const mockShowAlert = jest.fn();
const mockShowConfirm = jest.fn((title, message, options = {}) => {
  if (options.onConfirm) options.onConfirm();
});
const mockTranslationHook = jest.fn(() => ({
  t: (key) => key,
  i18n: { locale: 'ko' }
}));
const mockNavigationHook = jest.fn(() => ({
  goBack: jest.fn(),
  navigate: jest.fn()
}));
const mockAuthHook = jest.fn(() => ({
  auth: { id: '1', name: 'Test User' },
  authDataUpdatedAt: Date.now(),
  authErrorUpdatedAt: null,
  refetchAuth: jest.fn()
}));

const mockCreateMutationFn = jest.fn((actionKey, { gate, auth, t, i18n, navigation, queryClient, refetchAuth }) => {
  return jest.fn(async (params) => {
    if (actionKey === 'errorAction') throw new Error('FAIL');
    return { success: true, actionKey, data: params };
  });
});

// Modified actionDefs for testing verbose
const verboseActionDefs = {
  ...actionDefs,
  'errorAction': {
    gating: { path: '/users/', method: 'POST' },
    alertError: null // Implicit quiet
  }
};

describe('createUseAction - Verbose Logging', () => {
  let queryClient;
  let consoleGroupSpy;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    consoleGroupSpy = jest.spyOn(console, 'groupCollapsed').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
    consoleGroupSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const getUseAction = (factoryOptions = {}) => {
    return createUseGateAction({
      actionDefs: verboseActionDefs,
      gateDefs: terminalDef.gateDefs,
      createMutationFn: mockCreateMutationFn,
      useMutation,
      useQueryClient,
      showAlert: mockShowAlert,
      showConfirm: mockShowConfirm,
      translationHook: mockTranslationHook,
      navigationHook: mockNavigationHook,
      authHook: mockAuthHook,
      ...factoryOptions
    });
  };

  describe('Verbose Option Hierarchy', () => {
    test('should follow factory option (verbose: true)', async () => {
      const useAction = getUseAction({ verbose: true });
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(consoleGroupSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Bliss:Action:createUser]'),
        expect.any(String), expect.any(String)
      );
    });

    test('should follow factory option (verbose: false)', async () => {
      const useAction = getUseAction({ verbose: false });
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(consoleGroupSpy).not.toHaveBeenCalled();
    });

    test('should allow override at hook level (factory: false -> hook: true)', async () => {
      const useAction = getUseAction({ verbose: false });
      const { result } = renderHook(
        () => useAction('createUser', { 
          verbose: true,
          makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) 
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(consoleGroupSpy).toHaveBeenCalled();
    });

    test('should allow override at call level (factory: true -> hook: true -> call: false)', async () => {
      const useAction = getUseAction({ verbose: true });
      const { result } = renderHook(
        () => useAction('createUser', { 
          verbose: true,
          makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) 
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({ verbose: false });
      });

      expect(consoleGroupSpy).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Logging Detail', () => {
    test('should log all major steps correctly when verbose is true', async () => {
      const useAction = getUseAction({ verbose: true });
      const { result } = renderHook(
        () => useAction('createUser', { 
          makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) 
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      // Check Lifecycle labels (first argument of groupCollapsed)
      const labels = consoleGroupSpy.mock.calls.map(call => call[0]);
      expect(labels).toContain('%c[Bliss:Action:createUser] %cSTART');
      expect(labels).toContain('%c[Bliss:Action:createUser] %cVALIDATION_START');
      expect(labels).toContain('%c[Bliss:Action:createUser] %cEXECUTE_ACTUAL');
      expect(labels).toContain('%c[Bliss:Action:createUser] %cSUCCESS');
      
      // Check SUCCESS content
      expect(consoleLogSpy).toHaveBeenCalledWith('Response data:', expect.objectContaining({ success: true }));
    });

    test('should log error state correctly', async () => {
      const useAction = getUseAction({ verbose: true });
      const { result } = renderHook(
        () => useAction('errorAction', { 
          makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) 
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      const labels = consoleGroupSpy.mock.calls.map(call => call[0]);
      expect(labels).toContain('%c[Bliss:Action:errorAction] %cERROR');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error detail:', expect.any(Error));
    });
  });

  describe('Silence when verbose is false', () => {
    test('should not log anything even on error', async () => {
      const useAction = getUseAction({ verbose: false });
      const { result } = renderHook(
        () => useAction('errorAction', { 
          makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) 
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(consoleGroupSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
