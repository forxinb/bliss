const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider, useQueryClient } = require('@tanstack/react-query');
const createUseGenericAction = require('../create-use-generic-action');
const { makeSchema } = require('@godbliss/core/utils');

// QueryClient for testing
const createTestQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  // Set invalidateQueries as mock function
  queryClient.invalidateQueries = jest.fn();

  return queryClient;
};

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

// Test schema
const testSchema = makeSchema({
  name: { type: String, required: true },
  email: { type: String, required: true }
});

// Action definitions for error handling strategy tests
const errorHandlingActionDefs = {
  // For 'quiet' strategy test
  'quietErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertError: 'quiet',
    alertValidationError: 'quiet' // Handle validation error quietly
  },

  // For Object strategy test
  'objectErrorAction': {
    schema: testSchema,
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
    schema: testSchema,
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertValidationError: 'quiet' // Handle validation error quietly
    // No alertError (falsy)
  },

  // For Validation Error test
  'quietValidationErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => {
      return { success: true };
    }),
    alertValidationError: 'quiet'
  },

  'objectValidationErrorAction': {
    schema: testSchema,
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
    schema: testSchema,
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
    schema: testSchema,
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

describe('createUseGenericAction - Error Handling Strategies', () => {
  let queryClient;
  let useGenericAction;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    useGenericAction = createUseGenericAction({
      actionDefs: errorHandlingActionDefs,
      useQueryClient: () => queryClient,
      translationHook: mockTranslationHook,
      navigationHook: mockNavigationHook,
      authHook: mockAuthHook,
      showAlert: mockShowAlert,
      showConfirm: mockShowConfirm
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
        () => useGenericAction('quietErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
      });

      // Error should be handled quietly (no console warning)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should show custom alert when alertError is Object', async () => {
      const { result } = renderHook(
        () => useGenericAction('objectErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
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
        () => useGenericAction('falsyErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
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
        () => useGenericAction('quietValidationErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John' }, // Missing email causes validation error
            schema: testSchema
          }
        });
      });

      // Error should be handled quietly (no console warning)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should show custom alert when alertValidationError is Object', async () => {
      const { result } = renderHook(
        () => useGenericAction('objectValidationErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John' }, // Missing email causes validation error
            schema: testSchema
          }
        });
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
        () => useGenericAction('quietValidationErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John' }, // Missing email causes validation error
            schema: testSchema
          },
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
        () => useGenericAction('quietCheckErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
      });

      // Error should be handled quietly (no console warning)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    test('should show custom alert when alertCheckError is Object', async () => {
      const { result } = renderHook(
        () => useGenericAction('objectCheckErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
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
        () => useGenericAction('quietCheckErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          },
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
        () => useGenericAction('quietErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await quietResult.result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
      });

      // 2. Validation Error with 'quiet'
      const validationResult = renderHook(
        () => useGenericAction('quietValidationErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await validationResult.result.current.start({
          executionParams: {
            form: { name: 'John' }, // Missing email causes validation error
            schema: testSchema
          }
        });
      });

      // 3. Check Error with Object
      const objectResult = renderHook(
        () => useGenericAction('objectCheckErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await objectResult.result.current.start({
          executionParams: {
            form: { name: 'John', email: 'john@example.com' },
            schema: testSchema
          }
        });
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
        () => useGenericAction('quietErrorAction'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John' }, // Missing email causes validation error
            schema: testSchema
          },
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
