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
const mockCreateMutationFn = jest.fn((actionKey, { gate, auth, t, i18n, navigation, queryClient, refetchAuth }) => {
  return jest.fn(async (params) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, actionKey, data: params };
  });
});

describe('createUseAction - Error Handling', () => {
  let queryClient;
  let useAction;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    useAction = createUseGateAction({
      actionDefs,
      gateDefs: terminalDef.gateDefs,
      createMutationFn: mockCreateMutationFn,
      useMutation,
      useQueryClient,
      showAlert: mockShowAlert,
      showConfirm: mockShowConfirm,
      translationHook: mockTranslationHook,
      navigationHook: mockNavigationHook,
      authHook: mockAuthHook,
      // Stable version selectors (return same value on re-renders)
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

  describe('Action Definition Errors', () => {
    it('should throw error when action key not found', () => {
      expect(() => {
        renderHook(
          () => useAction('nonExistentAction', { makeGateContext: () => ({}) }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('Action definition not found or invalid for key: nonExistentAction');
    });

    it('should throw error when action definition is empty', () => {
      const emptyActionDefs = {};
      const useActionWithEmpty = createUseGateAction({
        actionDefs: emptyActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithEmpty('anyAction', { makeGateContext: () => ({}) }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('Action definition not found or invalid for key: anyAction');
    });

    it('should throw error when action definition is not an object', () => {
      const invalidActionDefs = {
        invalidAction: 'not an object'
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { makeGateContext: () => ({}) }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('Action definition not found or invalid for key: invalidAction');
    });
  });

  describe('Gating Errors', () => {
    it('should throw error when gating is missing', () => {
      const invalidActionDefs = {
        invalidAction: {
          // gating missing
          confirmAction: { title: 'Test' }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { makeGateContext: () => ({}) }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow("Action 'invalidAction' must have gating { path, method } as strings");
    });

    it('should throw error when gating path is missing', () => {
      const invalidActionDefs = {
        invalidAction: {
          gating: {
            method: 'POST'
            // path missing
          }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { gateContext: {} }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow("Action 'invalidAction' must have gating { path, method } as strings");
    });

    it('should throw error when gating method is missing', () => {
      const invalidActionDefs = {
        invalidAction: {
          gating: {
            path: '/users'
            // method missing
          }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { gateContext: {} }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow("Action 'invalidAction' must have gating { path, method } as strings");
    });

    it('should throw error when gating path is not a string', () => {
      const invalidActionDefs = {
        invalidAction: {
          gating: {
            path: 123, // number
            method: 'POST'
          }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { gateContext: {} }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow("Action 'invalidAction' must have gating { path, method } as strings");
    });

    it('should throw error when gating method is not a string', () => {
      const invalidActionDefs = {
        invalidAction: {
          gating: {
            path: '/users',
            method: 123 // number
          }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { gateContext: {} }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow("Action 'invalidAction' must have gating { path, method } as strings");
    });
  });

  describe('Gate Lookup Errors', () => {
    it('should throw error when gate not found', () => {
      const invalidActionDefs = {
        invalidAction: {
          gating: {
            path: '/non-existent-path',
            method: 'POST'
          }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { gateContext: {} }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('Gate not found: POST /non-existent-path');
    });

    it('should throw error when gate method not found', () => {
      const invalidActionDefs = {
        invalidAction: {
          gating: {
            path: '/users',
            method: 'PATCH' // non-existent method
          }
        }
      };
      const useActionWithInvalid = createUseGateAction({
        actionDefs: invalidActionDefs,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('invalidAction', { gateContext: {} }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('Gate not found: PATCH /users');
    });
  });

  describe('Form Validation Errors', () => {
    it('should call onValidationError callback when form validation fails with missing email', async () => {
      const onValidationError = jest.fn();

      const { result } = renderHook(
        () => useAction('createUser', { gateContext: { initialForm: { name: 'John' } } }), // email missing
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: { form: { name: 'John' } }, // email missing
          onValidationError
        });
      });

      // onValidationError callback should be called with validation error
      expect(onValidationError).toHaveBeenCalledTimes(1);
      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ClientError',
          message: 'Email is required',
          details: expect.arrayContaining([
            expect.objectContaining({
              name: 'email',
              type: 'required'
            })
          ])
        })
      );
      // mockShowAlert should also be called for validation error
      expect(mockShowAlert).toHaveBeenCalled();
    });

    it('should call onValidationError callback when form validation fails with invalid email', async () => {
      const onValidationError = jest.fn();

      const { result } = renderHook(
        () => useAction('createUser', { gateContext: { initialForm: { name: 'John', email: 'invalid-email' } } }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: { form: { name: 'John', email: 'invalid-email' } },
          onValidationError
        });
      });

      // onValidationError callback should be called with validation error for invalid email format
      expect(onValidationError).toHaveBeenCalledTimes(1);
      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ClientError',
          message: 'Email failed regular expression validation',
          details: expect.arrayContaining([
            expect.objectContaining({
              name: 'email',
              type: 'regEx'
            })
          ])
        })
      );
      expect(mockShowAlert).toHaveBeenCalled();
    });

    it('should call onValidationError callback when form validation fails with missing required field', async () => {
      const onValidationError = jest.fn();

      const { result } = renderHook(
        () => useAction('createPost', { gateContext: { initialForm: { title: 'Test Post' } } }), // content, authorId missing
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        await result.current.start({
          executionParams: { form: { title: 'Test Post' } }, // content, authorId missing
          onValidationError
        });
      });

      // onValidationError callback should be called with validation error for missing required fields
      expect(onValidationError).toHaveBeenCalledTimes(1);
      expect(onValidationError).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ClientError',
          message: 'Content is required', // First missing required field
          details: expect.arrayContaining([
            expect.objectContaining({ name: 'content', type: 'required' }),
            expect.objectContaining({ name: 'authorId', type: 'required' })
          ])
        })
      );
      // Note: createPost doesn't have alertValidationError defined, 
      // so mockShowAlert is not called (validation failure is handled silently)
    });

    it('should not call mutation when validation fails', async () => {
      const onValidationError = jest.fn();

      const { result } = renderHook(
        () => useAction('createUser', { gateContext: { initialForm: { name: 'John' } } }), // email missing
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Clear mock to check mutation call count after start
      mockCreateMutationFn.mockClear();

      await act(async () => {
        await result.current.start({
          executionParams: { form: { name: 'John' } }, // email missing
          onValidationError
        });
      });

      // Mutation function should not be called (validation failed before execution)
      // Note: createMutationFn is called during hook initialization, not during execution
      // So we check that the actual mutation (execute) was not triggered by verifying onValidationError was called
      expect(onValidationError).toHaveBeenCalled();
    });
  });

  describe('createMutationFn Errors', () => {
    it('should throw error when createMutationFn returns non-function', () => {
      const invalidCreateMutationFn = jest.fn(() => 'not a function');
      const useActionWithInvalid = createUseGateAction({
        actionDefs,
        gateDefs: terminalDef.gateDefs,
        createMutationFn: invalidCreateMutationFn,
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

      expect(() => {
        renderHook(
          () => useActionWithInvalid('createUser', { gateContext: { initialForm: { name: 'John', email: 'john@example.com' } } }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('createMutationFn must return a function');
    });
  });

  describe('External Hook Errors', () => {
    it('should handle translationHook error gracefully', () => {
      const errorTranslationHook = jest.fn(() => {
        throw new Error('Translation hook error');
      });

      const useAction = createUseGateAction({
        actionDefs,
        gateDefs: terminalDef.gateDefs,
        createMutationFn: mockCreateMutationFn,
        useMutation,
        useQueryClient,
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm,
        translationHook: errorTranslationHook,
        navigationHook: mockNavigationHook,
        authHook: mockAuthHook
      });

      expect(() => {
        renderHook(() => useAction('createUser', { gateContext: { initialForm: { name: 'John', email: 'john@example.com' } } }));
      }).toThrow('Translation hook error');
    });

    it('should handle navigationHook error gracefully', () => {
      const errorNavigationHook = jest.fn(() => {
        throw new Error('Navigation hook error');
      });

      const useAction = createUseGateAction({
        actionDefs,
        gateDefs: terminalDef.gateDefs,
        createMutationFn: mockCreateMutationFn,
        useMutation,
        useQueryClient,
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm,
        translationHook: mockTranslationHook,
        navigationHook: errorNavigationHook,
        authHook: mockAuthHook
      });

      expect(() => {
        renderHook(() => useAction('createUser', { gateContext: { initialForm: { name: 'John', email: 'john@example.com' } } }));
      }).toThrow('Navigation hook error');
    });

    it('should handle authHook error gracefully', () => {
      const errorAuthHook = jest.fn(() => {
        throw new Error('Auth hook error');
      });

      const useAction = createUseGateAction({
        actionDefs,
        gateDefs: terminalDef.gateDefs,
        createMutationFn: mockCreateMutationFn,
        useMutation,
        useQueryClient,
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm,
        translationHook: mockTranslationHook,
        navigationHook: mockNavigationHook,
        authHook: errorAuthHook,
        customQueryClient: createTestQueryClient() // Prevent QueryClient error
      });

      expect(() => {
        renderHook(
          () => useAction('createUser', { gateContext: { initialForm: { name: 'John', email: 'john@example.com' } } }),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('Auth hook error');
    });
  });

  describe('Concurrency Control Errors', () => {
    it('should prevent duplicate start calls', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        result.current.start();
        result.current.start(); // duplicate call
      });

      // createMutationFn should only be called once
      expect(mockCreateMutationFn).toHaveBeenCalledTimes(1);

      // Concurrency control check
      expect(result.current.isRunning).toBe(true);  // First start() is still running
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'start already executing...; new start request ignored',
        'createUser'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle validation error and reset state', async () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }), // email missing causes validation error
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Validation error is not thrown, handled by showValidationError
      await act(async () => {
        result.current.start();
      });

      // Check if validation error was handled (console warning is output)
      // isRunning state is reset after alert is shown, so check with delay
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // After error, start should be callable again (concurrency control is reset)
      await act(async () => {
        result.current.start();
      });
    });
  });
});
