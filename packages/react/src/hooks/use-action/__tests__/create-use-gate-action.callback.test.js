const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider, useMutation, useQueryClient } = require('@tanstack/react-query');
const createUseGateAction = require('../create-use-gate-action');
const { actionDefs, terminalDef } = require('../__mocks__/gate-action-defs');

// Import schema for testing
const { makeSchema } = require('@godbliss/core/utils');
const userSchema = makeSchema({
  name: { type: String, required: true },
  email: { type: String, required: true, regEx: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  age: { type: Number, min: 0, max: 150, optional: true }
});

// QueryClient for testing
const createTestQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  // Set invalidateQueries as mock function
  // The actual queryClient.invalidateQueries exists, but Jest's toHaveBeenCalledWith() only works with mock functions
  // Test purpose: Only checking call occurrence, not actual behavior, so using mock function is appropriate
  queryClient.invalidateQueries = jest.fn();

  return queryClient;
};

// Test wrapper component
const TestWrapper = ({ children, queryClient }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Mock functions - Simulating real user scenarios
let mockShowAlert = jest.fn();
let mockConfirmCallback = null;
let mockShowConfirm = jest.fn((title, message, options) => {
  // Save callback like when real user clicks confirm button
  mockConfirmCallback = options.onConfirm;
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

// Simulating real mutation function
const mockCreateMutationFn = jest.fn((actionKey, { gate, auth, t, i18n, navigation, queryClient, refetchAuth }) => {
  return jest.fn(async (params) => {
    // Simulating real API call
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulating success response
    return {
      success: true,
      actionKey,
      data: params,
      message: 'User created successfully',
      timestamp: Date.now()
    };
  });
});

// Simulating error mutation function
const mockCreateErrorMutationFn = jest.fn((actionKey, { gate, auth, t, i18n, navigation, queryClient, refetchAuth }) => {
  return jest.fn(async (params) => {
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulating error response
    throw new Error('Network error: Failed to create user');
  });
});

describe('createUseGateAction - Callback Tests (Essential Tests)', () => {
  let queryClient;
  let useAction;
  let mockNavigation;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    // Initialize mock functions with new jest.fn() each time
    // Required to prevent interference between tests using mockImplementation
    mockShowAlert = jest.fn();
    mockShowConfirm = jest.fn((title, message, options) => {
      // Default behavior: save callback
      mockConfirmCallback = options.onConfirm;
    });
    mockConfirmCallback = null;
    mockTranslationHook.mockClear();
    mockNavigationHook.mockClear();
    mockAuthHook.mockClear();
    mockCreateMutationFn.mockClear();
    mockCreateErrorMutationFn.mockClear();

    // Navigation mock setup
    mockNavigation = {
      goBack: jest.fn(),
      navigate: jest.fn()
    };
    mockNavigationHook.mockReturnValue(mockNavigation);

    // Create useAction hook with success mutation
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
      authHook: mockAuthHook
    });
  });

  describe('actionDef callback tests - Actually existing features', () => {
    test('should execute alertSuccess when action succeeds', async () => {
      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' }
        });
      });

      // Click confirm button
      if (mockConfirmCallback) {
        await act(async () => {
          mockConfirmCallback();
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify alertSuccess was called
      expect(mockShowAlert).toHaveBeenCalledWith(
        'Creation Complete',
        'User has been created.',
        expect.any(Object)
      );
    });

    test('should execute goOnSuccess (navigation.goBack) when action succeeds', async () => {
      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' }
        });
      });

      // Click confirm button
      if (mockConfirmCallback) {
        await act(async () => {
          mockConfirmCallback();
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify goOnSuccess was called (set to 'back' in actionDef)
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    test('should execute invalidateQueriesOnSuccess when action succeeds', async () => {
      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' }
        });
      });

      // Click confirm button
      if (mockConfirmCallback) {
        await act(async () => {
          mockConfirmCallback();
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify invalidateQueriesOnSuccess was called
      // Verify queryClient.invalidateQueries was called
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
        { queryKey: ['users'] },
        {}
      );
    });
  });

  describe('executionOptions callback tests - React Query mutate options', () => {
    test('should execute executionOptions.onSuccess correctly', async () => {
      const executionOptionsOnSuccess = jest.fn((data) => {
        console.log('executionOptions.onSuccess called with:', data);
      });

      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      const executionOptions = {
        onSuccess: executionOptionsOnSuccess
      };

      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' },
          executionOptions
        });
      });

      // Click confirm button
      if (mockConfirmCallback) {
        await act(async () => {
          mockConfirmCallback();
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify executionOptions.onSuccess was called
      expect(executionOptionsOnSuccess).toHaveBeenCalledTimes(1);
    });

    test('should execute executionOptions.onError when mutation fails', async () => {
      const executionOptionsOnError = jest.fn((error) => {
        console.log('executionOptions.onError called with:', error);
      });

      // Create useAction with error mutation
      const errorUseAction = createUseGateAction({
        actionDefs,
        gateDefs: terminalDef.gateDefs,
        createMutationFn: mockCreateErrorMutationFn,
        useMutation,
        useQueryClient,
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm,
        translationHook: mockTranslationHook,
        navigationHook: mockNavigationHook,
        authHook: mockAuthHook
      });

      const { result } = renderHook(
        () => errorUseAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'Error User';
        result.current.form.email = 'error@example.com';
        result.current.form.age = 30;
      });

      const executionOptions = {
        onError: executionOptionsOnError
      };

      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' },
          executionOptions
        });
      });

      // Click confirm button
      if (mockConfirmCallback) {
        await act(async () => {
          mockConfirmCallback();
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify executionOptions.onError was called
      expect(executionOptionsOnError).toHaveBeenCalledTimes(1);

      // Verify error content
      const error = executionOptionsOnError.mock.calls[0][0];
      expect(error.message).toBe('Network error: Failed to create user');
    });
  });

  describe('Execution order test - actionDef callbacks → executionOptions callbacks', () => {
    test('should execute actionDef callbacks before executionOptions callbacks', async () => {
      const callbackExecutionOrder = [];

      const executionOptionsOnSuccess = jest.fn((data) => {
        callbackExecutionOrder.push('executionOptions.onSuccess');
        console.log('executionOptions.onSuccess called with:', data);
      });

      // Implement mockShowAlert for test purposes
      mockShowAlert.mockImplementation((title, message, options) => {
        callbackExecutionOrder.push('actionDef.alertSuccess');
        console.log('actionDef.alertSuccess called:', title, message);
        // No actual UI behavior needed in tests
      });

      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      const executionOptions = {
        onSuccess: executionOptionsOnSuccess
      };

      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' },
          executionOptions
        });
      });

      // Click confirm button
      if (mockConfirmCallback) {
        await act(async () => {
          mockConfirmCallback();
        });
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      // Verify execution order: actionDef callbacks should execute first
      expect(callbackExecutionOrder).toEqual([
        'actionDef.alertSuccess',
        'executionOptions.onSuccess'
      ]);
    });
  });

  describe('Real user scenario integration test', () => {
    test('complete user flow: form fill → start → confirm → success callbacks', async () => {
      const userFlowSteps = [];

      const executionOptionsOnSuccess = jest.fn((data) => {
        userFlowSteps.push('executionOptions.onSuccess');
        console.log('Complete user flow - executionOptions.onSuccess:', data);
      });

      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // 1. User fills the form
      userFlowSteps.push('form-fill');
      act(() => {
        result.current.form.name = 'Complete User';
        result.current.form.email = 'complete@example.com';
        result.current.form.age = 35;
      });

      // 2. User clicks start button
      userFlowSteps.push('start-click');
      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' },
          executionOptions: { onSuccess: executionOptionsOnSuccess }
        });
      });

      // 3. Confirm dialog is displayed
      userFlowSteps.push('confirm-dialog');
      expect(mockShowConfirm).toHaveBeenCalled();

      // 4. User clicks confirm button (record at click time)
      if (mockConfirmCallback) {
        await act(async () => {
          userFlowSteps.push('confirm-click');
          mockConfirmCallback();
        });
      }

      // 5. Action execution and completion (record at completion time)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200)).then(() => {
          userFlowSteps.push('after-action-complete');
        });
      });

      // Verify complete user flow
      expect(userFlowSteps).toEqual([
        'form-fill',
        'start-click',
        'confirm-dialog',
        'confirm-click',
        'executionOptions.onSuccess',
        'after-action-complete'
      ]);

      // Verify all callbacks were called
      expect(executionOptionsOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockShowAlert).toHaveBeenCalled(); // alertSuccess
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1); // goOnSuccess
      expect(queryClient.invalidateQueries).toHaveBeenCalled(); // invalidateQueriesOnSuccess
    });
  });
});
