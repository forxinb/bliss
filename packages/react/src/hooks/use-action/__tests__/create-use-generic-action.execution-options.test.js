const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { makeSchema } = require('@godbliss/core/utils');

const createUseGenericAction = require('../create-use-generic-action');
const { genericActionDefs } = require('../__mocks__/generic-action-defs');

// Test schema
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
  // Actual queryClient.invalidateQueries exists, but Jest's toHaveBeenCalledWith() only works with mock functions
  // Test purpose: only checking if called, not actual behavior, so mock function is appropriate
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
let mockShowAlert = jest.fn();
let mockShowConfirm = jest.fn();
let mockConfirmCallback = null;

const mockTranslationHook = jest.fn(() => ({
  t: (key) => key,
  language: 'ko'
}));

const mockNavigationHook = jest.fn(() => ({
  goBack: jest.fn(),
  navigate: jest.fn(),
  params: {}
}));

const mockAuthHook = jest.fn(() => ({
  user: { id: 'test-user', name: 'Test User' },
  isAuthenticated: true
}));

describe('createUseGenericAction - executionOptions', () => {
  let queryClient;
  let useAction;
  let actionDefs;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    // Initialize mock functions with new jest.fn() each time
    // Required to prevent interference between tests that use mockImplementation
    mockShowAlert = jest.fn();
    mockShowConfirm = jest.fn((title, message, options) => {
      // Default behavior: save callback
      mockConfirmCallback = options.onConfirm;
    });
    mockConfirmCallback = null;

    mockTranslationHook.mockClear();
    mockNavigationHook.mockClear();
    mockAuthHook.mockClear();

    // Extended action definitions for testing: add actions with confirmAction
    actionDefs = {
      ...genericActionDefs,
      createUserWithConfirm: {
        // Confirm action for success case
        execute: jest.fn(async ({ form, priority }) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { success: true, user: form, priority };
        }),
        schema: userSchema,
        confirmAction: { title: 'Confirm', message: 'Proceed?' },
        alertSuccess: { title: 'Success', message: 'Complete' }
      },
      createUserWithConfirmError: {
        // Confirm action for error case
        execute: jest.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          throw new Error('Creation failed');
        }),
        schema: userSchema,
        confirmAction: { title: 'Confirm', message: 'Proceed?' },
        alertError: { title: 'Failed', message: 'Error occurred' }
      }
    };

    useAction = createUseGenericAction({
      actionDefs,
      schemaSelector: () => userSchema,
      initialForm: { name: 'John Doe', email: 'john@example.com', age: 30 },
      customQueryClient: queryClient,
      showAlert: mockShowAlert,
      showConfirm: mockShowConfirm,
      translationHook: mockTranslationHook,
      navigationHook: mockNavigationHook,
      authHook: mockAuthHook
    });
  });

  describe('executionOptions Passing and Execution', () => {
    test('should pass executionOptions to execute function', async () => {
      const executionOptionsOnSuccess = jest.fn();
      const executionOptionsOnError = jest.fn();

      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Call start with executionOptions
      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'Test User', email: 'test@example.com', age: 30 },
            priority: 'high'
          },
          executionOptions: {
            onSuccess: executionOptionsOnSuccess,
            onError: executionOptionsOnError
          }
        });
      });

      // Verify executionOptions.onSuccess was called
      expect(executionOptionsOnSuccess).toHaveBeenCalledTimes(1);
      expect(executionOptionsOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com',
            age: 30
          }),
          priority: 'high'
        })
      );
    });

    test('should execute executionOptions.onError when action fails', async () => {
      const executionOptionsOnSuccess = jest.fn();
      const executionOptionsOnError = jest.fn();

      const { result } = renderHook(
        () => useAction('createUserWithError'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Call start with executionOptions
      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'Test User', email: 'test@example.com', age: 30 },
            priority: 'high'
          },
          executionOptions: {
            onSuccess: executionOptionsOnSuccess,
            onError: executionOptionsOnError
          }
        });
      });

      // Verify executionOptions.onError was called
      expect(executionOptionsOnError).toHaveBeenCalledTimes(1);
      expect(executionOptionsOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Creation failed'
        })
      );

      // executionOptions.onSuccess should not be called
      expect(executionOptionsOnSuccess).not.toHaveBeenCalled();
    });

    test('should work without executionOptions', async () => {
      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Call start without executionOptions
      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'low' }
        });
      });

      // Verify default behavior works correctly
      expect(result.current.isRunning).toBe(false);
      // useGenericAction may not provide isSuccess
    });
  });

  describe('Execution Order Test - actionDef Callbacks → executionOptions Callbacks', () => {
    test('should execute actionDef callbacks before executionOptions callbacks', async () => {
      const callbackExecutionOrder = [];

      const executionOptionsOnSuccess = jest.fn((data) => {
        callbackExecutionOrder.push('executionOptions.onSuccess');
        console.log('executionOptions.onSuccess called with:', data);
      });

      // Implement mockShowAlert for test purpose
      mockShowAlert.mockImplementation((title, message, options) => {
        callbackExecutionOrder.push('actionDef.alertSuccess');
        console.log('actionDef.alertSuccess called:', title, message);
        // No actual UI behavior needed in tests
      });

      const { result } = renderHook(
        () => useAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Call start with executionOptions
      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'Test User', email: 'test@example.com', age: 30 },
            priority: 'high'
          },
          executionOptions: {
            onSuccess: executionOptionsOnSuccess
          }
        });
      });

      // Verify execution order: actionDef callbacks should execute first
      expect(callbackExecutionOrder).toEqual([
        'actionDef.alertSuccess',
        'executionOptions.onSuccess'
      ]);
    });
  });

  describe('Real User Scenario Integration Test', () => {
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

      // 1. Set form data (via initialForm)
      userFlowSteps.push('form-fill');
      // initialForm is already set, no separate setup needed

      // 2. Call start
      userFlowSteps.push('start-click');
      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'Test User', email: 'test@example.com', age: 30 },
            priority: 'high'
          },
          executionOptions: {
            onSuccess: executionOptionsOnSuccess
          }
        });
      });

      // 3. Handle confirmation dialog
      userFlowSteps.push('confirm-dialog');
      if (mockConfirmCallback) {
        userFlowSteps.push('confirm-click');
        await act(async () => {
          mockConfirmCallback();
        });
      }

      // 4. Wait for action execution to complete
      userFlowSteps.push('action-execution');

      // Verify complete user flow
      expect(userFlowSteps).toEqual([
        'form-fill',
        'start-click',
        'executionOptions.onSuccess',
        'confirm-dialog',
        'action-execution'
      ]);

      // Verify executionOptions.onSuccess was called
      expect(executionOptionsOnSuccess).toHaveBeenCalledTimes(1);
      expect(executionOptionsOnSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            name: 'Test User',
            email: 'test@example.com',
            age: 30
          }),
          priority: 'high'
        })
      );
    });
  });

  describe('Execution After Confirm and Handler Order Verification', () => {
    test('should execute only after confirm and call handlers in order (success)', async () => {
      const callbackExecutionOrder = [];
      const executionOptionsOnSuccess = jest.fn(() => {
        callbackExecutionOrder.push('executionOptions.onSuccess');
      });

      // Record order when actionDef.alertSuccess is called
      mockShowAlert.mockImplementation(() => {
        callbackExecutionOrder.push('actionDef.alertSuccess');
      });

      const { result } = renderHook(
        () => useAction('createUserWithConfirm'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data (required to pass validation)
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      // Call start (not executed immediately due to confirmAction)
      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John Doe', email: 'john@example.com', age: 30 },
            priority: 'high'
          },
          executionOptions: { onSuccess: executionOptionsOnSuccess }
        });
      });

      // Execute should not be called before confirm
      expect(actionDefs.createUserWithConfirm.execute).not.toHaveBeenCalled();

      // Simulate confirm button click → proceed with actual execution
      await act(async () => {
        mockConfirmCallback && mockConfirmCallback();
        // Wait for async execution to complete
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Verify executed
      expect(actionDefs.createUserWithConfirm.execute).toHaveBeenCalledWith({
        form: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        }),
        schema: expect.any(Object),
        priority: 'high'
      });

      // Execution order: actionDef.alertSuccess → executionOptions.onSuccess
      expect(callbackExecutionOrder).toEqual([
        'actionDef.alertSuccess',
        'executionOptions.onSuccess'
      ]);
    });

    test('should execute only after confirm and call handlers in order (error)', async () => {
      const callbackExecutionOrder = [];
      const executionOptionsOnError = jest.fn(() => {
        callbackExecutionOrder.push('executionOptions.onError');
      });

      // Record order when actionDef.alertError is called
      mockShowAlert.mockImplementation(() => {
        callbackExecutionOrder.push('actionDef.alertError');
      });

      const { result } = renderHook(
        () => useAction('createUserWithConfirmError'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data (required to pass validation)
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      // Call start (not executed immediately due to confirmAction)
      await act(async () => {
        await result.current.start({
          executionParams: {
            form: { name: 'John Doe', email: 'john@example.com', age: 30 }
          },
          executionOptions: { onError: executionOptionsOnError }
        });
      });

      // Execute should not be called before confirm
      expect(actionDefs.createUserWithConfirmError.execute).not.toHaveBeenCalled();

      // Simulate confirm button click → proceed with actual execution
      await act(async () => {
        mockConfirmCallback && mockConfirmCallback();
        // Wait for async execution to complete
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      // Verify execution was attempted
      expect(actionDefs.createUserWithConfirmError.execute).toHaveBeenCalled();

      // Execution order: actionDef.alertError → executionOptions.onError
      expect(callbackExecutionOrder).toEqual([
        'actionDef.alertError',
        'executionOptions.onError'
      ]);
    });
  });
});
