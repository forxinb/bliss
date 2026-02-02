const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider, useMutation, useQueryClient } = require('@tanstack/react-query');
const createUseGateAction = require('../create-use-gate-action');
const { terminalDef } = require('../__mocks__/gate-action-defs');

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
const mockShowConfirm = jest.fn();
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

// Action definitions for error handling strategy tests
const errorHandlingActionDefs = {
  // For 'quiet' strategy test
  'quietErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertError: 'quiet',
    alertValidationError: 'quiet' // Handle validation error quietly
  },

  // For Object strategy test
  'objectErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertError: {
      title: 'Custom Error Title',
      message: 'Custom error message',
      closeText: 'Close',
      onClose: jest.fn()
    },
    alertValidationError: 'quiet' // Handle validation error quietly
  },

  // For falsy strategy test (default)
  'falsyErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertValidationError: 'quiet' // Handle validation error quietly
    // No alertError (falsy)
  },

  // For Validation Error test
  'quietValidationErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      return { success: true };
    }),
    alertValidationError: 'quiet'
  },

  'objectValidationErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      return { success: true };
    }),
    alertValidationError: {
      title: 'Validation Error',
      message: 'Please check your input',
      closeText: 'OK'
    }
  },

  // For Check Error test
  'quietCheckErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      return { success: true };
    }),
    check: jest.fn(async () => {
      throw new Error('Check failed');
    }),
    alertCheckError: 'quiet',
    alertValidationError: 'quiet' // Handle validation error quietly
  },

  'objectCheckErrorAction': {
    gating: { path: '/users/', method: 'POST' },
    execute: jest.fn(async () => {
      return { success: true };
    }),
    check: jest.fn(async () => {
      throw new Error('Check failed');
    }),
    alertCheckError: {
      title: 'Check Failed',
      message: 'Please try again',
      closeText: 'Retry'
    },
    alertValidationError: 'quiet' // Handle validation error quietly
  }
};

// Mock createMutationFn
const mockCreateMutationFn = jest.fn((actionKey, { gate, auth, t, i18n, navigation, queryClient, refetchAuth }) => {
  return jest.fn(async (params) => {
    const actionDef = errorHandlingActionDefs[actionKey];
    if (actionDef && actionDef.execute) {
      return await actionDef.execute(params);
    }
    return { success: true, actionKey, data: params };
  });
});

describe('createUseGateAction - Error Handling Strategies', () => {
  let queryClient;
  let useAction;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    useAction = createUseGateAction({
      actionDefs: errorHandlingActionDefs,
      gateDefs: terminalDef.gateDefs,
      createMutationFn: mockCreateMutationFn,
      useMutation,
      useQueryClient,
      showAlert: mockShowAlert,
      showConfirm: mockShowConfirm,
      translationHook: mockTranslationHook,
      navigationHook: mockNavigationHook,
      authHook: mockAuthHook,
      authVersionSelector: () => 'test-auth-v1',
      appContextVersionSelector: () => 'test-app-v1',
      translationVersionSelector: () => 'test-translation-v1',
      navigationVersionSelector: () => 'test-navigation-v1'
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Execution Error Handling Strategies', () => {
    test('should handle error quietly when alertError is "quiet"', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useAction('quietErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      // Error should be handled quietly (no console warning)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should show custom alert when alertError is Object', async () => {
      const { result } = renderHook(
        () => useAction('objectErrorAction', {
          makeGateContext: () => ({
            initialForm: { name: 'John', email: 'john@example.com' }
          })
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockShowAlert).toHaveBeenCalledWith(
        'Custom Error Title',
        'Custom error message',
        expect.objectContaining({
          closeText: 'Close',
          onClose: expect.any(Function)
        })
      );
    });

    test('should use default handling when alertError is falsy', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useAction('falsyErrorAction', {
          makeGateContext: () => ({
            initialForm: { name: 'John', email: 'john@example.com' }
          })
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      // Default handling: console warning then stop silently
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'execution failed for action \'falsyErrorAction\':',
        expect.any(Error)
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'actionDef.alertError is not provided for \'falsyErrorAction\', so execution failure is handled silently.'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Validation Error Handling Strategies', () => {
    test('should handle validation error quietly when alertValidationError is "quiet"', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useAction('quietValidationErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }), // Missing email causes validation error
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      // Error should be handled quietly (no console warning)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should show custom alert when alertValidationError is Object', async () => {
      const { result } = renderHook(
        () => useAction('objectValidationErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }), // Missing email causes validation error
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockShowAlert).toHaveBeenCalledWith(
        'Validation Error',
        'Please check your input',
        expect.objectContaining({
          closeText: 'OK',
          onClose: expect.any(Function)
        })
      );
    });

    test('should call onValidationError callback when provided', async () => {
      const onValidationErrorMock = jest.fn();

      const { result } = renderHook(
        () => useAction('quietValidationErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }), // Missing email causes validation error
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          onValidationError: onValidationErrorMock
        });
      });

      // onValidationError callback should be called
      expect(onValidationErrorMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ClientError',
        message: 'Email is required'
      }));
    });
  });

  describe('Check Error Handling Strategies', () => {
    test('should handle check error quietly when alertCheckError is "quiet"', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useAction('quietCheckErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      // Error should be handled quietly (no console warning)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should show custom alert when alertCheckError is Object', async () => {
      const { result } = renderHook(
        () => useAction('objectCheckErrorAction', {
          makeGateContext: () => ({
            initialForm: { name: 'John', email: 'john@example.com' }
          })
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockShowAlert).toHaveBeenCalledWith(
        'Check Failed',
        'Please try again',
        expect.objectContaining({
          closeText: 'Retry',
          onClose: expect.any(Function)
        })
      );
    });

    test('should call onCheckError callback when provided', async () => {
      const onCheckErrorMock = jest.fn();

      const { result } = renderHook(
        () => useAction('quietCheckErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          onCheckError: onCheckErrorMock
        });
      });

      // onCheckError callback should be called
      expect(onCheckErrorMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Check failed'
      }));
    });
  });

  describe('Error Handling Strategies Integration Test', () => {
    test('should handle multiple error types with different strategies', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // 1. Execution Error with 'quiet'
      const quietResult = renderHook(
        () => useAction('quietErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await quietResult.result.current.start();
      });

      // 2. Validation Error with 'quiet'
      const validationResult = renderHook(
        () => useAction('quietValidationErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await validationResult.result.current.start();
      });

      // 3. Check Error with Object
      const objectResult = renderHook(
        () => useAction('objectCheckErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await objectResult.result.current.start();
      });

      // Verify each strategy worked correctly
      expect(mockShowAlert).toHaveBeenCalledTimes(1); // Only Object strategy shows alert
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // quiet strategy has no console warning

      consoleWarnSpy.mockRestore();
    });

    test('should call multiple error callbacks when provided', async () => {
      const onValidationErrorMock = jest.fn();
      const onCheckErrorMock = jest.fn();
      const onExecutionErrorMock = jest.fn();

      const { result } = renderHook(
        () => useAction('quietErrorAction', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }), // Missing email causes validation error
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          onValidationError: onValidationErrorMock,
          onCheckError: onCheckErrorMock,
          executionOptions: {
            onError: onExecutionErrorMock
          }
        });
      });

      // Since validation error occurs, only onValidationError should be called
      expect(onValidationErrorMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ClientError',
        message: 'Email is required'
      }));
      expect(onCheckErrorMock).not.toHaveBeenCalled();
      expect(onExecutionErrorMock).not.toHaveBeenCalled();
    });
  });
});
