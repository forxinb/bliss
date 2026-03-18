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
  // For 'quiet' strategy test (Implicit quiet now)
  'quietErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertError: null,
    alertValidationError: null
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
    alertValidationError: null
  },

  // For falsy strategy test (default)
  'falsyErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => {
      throw new Error('Execution failed');
    }),
    alertError: null
  },

  // For Validation Error test
  'quietValidationErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => {
      return { success: true };
    }),
    alertValidationError: null
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
    alertCheckError: null
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
    }
  },

  // --- Identity Test Variations ---
  'undefinedErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => { throw new Error('FAIL'); }),
    // alertError omitted
  },
  'nullErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => { throw new Error('FAIL'); }),
    alertError: null
  },
  'falseErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => { throw new Error('FAIL'); }),
    alertError: false
  },
  'stringErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => { throw new Error('FAIL'); }),
    alertError: 'Just a string message'
  },
  'emptyStringErrorAction': {
    schema: testSchema,
    execute: jest.fn(async () => { throw new Error('FAIL'); }),
    alertError: ''
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
    test('should handle error quietly when verbose is false and no alert defined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(
        () => useGenericAction('quietErrorAction', { verbose: false }),
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

      // Error should be handled quietly (no console warning/error)
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('should log warning when verbose is true and no alert defined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useGenericAction('quietErrorAction', { verbose: true }),
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

      // Should log warning about missing alert definition
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Bliss:Action:quietErrorAction] execution failed, but no UI alert (actionDef.alertError) was defined"),
      );

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

    test('should log error details when verbose is true and alertError is falsy', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useGenericAction('falsyErrorAction', { verbose: true }),
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

      // New verbose console output format
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Bliss:Action:falsyErrorAction] execution failed, but no UI alert (actionDef.alertError) was defined"),
      );

      consoleWarnSpy.mockRestore();
    });

    describe('Identity of Unsupported Alert Values', () => {
      test.each([
        ['undefinedErrorAction', 'undefined (implicit)'],
        ['nullErrorAction', 'null (explicit)'],
        ['falseErrorAction', 'false (explicit)'],
        ['stringErrorAction', 'non-empty string'],
        ['emptyStringErrorAction', 'empty string'],
      ])('should behave identically when alertError is %s (%s)', async (actionKey) => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        // 1. Verify quiet behavior with verbose: false
        const quietHook = renderHook(
          () => useGenericAction(actionKey, { verbose: false }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );

        await act(async () => {
          await quietHook.result.current.start({
            executionParams: { form: { name: 'J', email: 'j@e.com' }, schema: testSchema }
          });
        });

        expect(mockShowAlert).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();

        // 2. Verify logging behavior with verbose: true
        const verboseHook = renderHook(
          () => useGenericAction(actionKey, { verbose: true }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );

        await act(async () => {
          await verboseHook.result.current.start({
            executionParams: { form: { name: 'J', email: 'j@e.com' }, schema: testSchema }
          });
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`[Bliss:Action:${actionKey}] execution failed, but no UI alert (actionDef.alertError) was defined`),
        );

        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('Validation Error Handling Strategies', () => {
    test('should handle validation error quietly when verbose is false', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useGenericAction('quietValidationErrorAction', { verbose: false }),
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
    test('should handle check error quietly when verbose is false', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useGenericAction('quietCheckErrorAction', { verbose: false }),
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

      // 1. Execution Error (Quiet with verbose: false)
      const quietResult = renderHook(
        () => useGenericAction('quietErrorAction', { verbose: false }),
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

      // 2. Validation Error (Quiet with verbose: false)
      const validationResult = renderHook(
        () => useGenericAction('quietValidationErrorAction', { verbose: false }),
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
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // quiet because verbose: false

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
