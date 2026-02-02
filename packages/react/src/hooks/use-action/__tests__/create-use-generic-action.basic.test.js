const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider, useQueryClient } = require('@tanstack/react-query');
const createUseGenericAction = require('../create-use-generic-action');
const { makeSchema } = require('@godbliss/core/utils');
const { genericActionDefs, userSchema, defaultSchema } = require('../__mocks__/generic-action-defs');

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

// Test schemas (imported from generic-action-defs.js)
const postSchema = makeSchema({
  title: { type: String, required: true },
  content: { type: String, required: true }
});

// Dynamic schema function (for existing tests)
const createUserSchemaByType = (selector) => {
  if (selector.userType === 'admin') {
    return makeSchema({
      name: { type: String, required: true },
      email: { type: String, required: true },
      age: { type: Number, min: 0, max: 150 },
      role: { type: String, required: true }
    });
  }
  return userSchema;
};

// Action definitions for testing (extends genericActionDefs)
const actionDefs = {
  ...genericActionDefs,
  // Add existing test actions
  'createUserDynamic': {
    schema: createUserSchemaByType,
    execute: jest.fn(async ({ form, userType }) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true, user: form, userType };
    })
  },
  'createPost': {
    schema: postSchema,
    execute: jest.fn(async ({ form }) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true, post: form };
    })
  },
  'createUserNoSchema': {
    execute: jest.fn(async ({ form }) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true, data: form };
    })
  }
};

describe('createUseGenericAction - Basic Functionality', () => {
  let queryClient;
  let useGenericAction;

  beforeEach(() => {
    queryClient = createTestQueryClient();

    // Initialize mock functions
    mockShowAlert.mockClear();
    mockShowConfirm.mockClear();
    mockTranslationHook.mockClear();
    mockNavigationHook.mockClear();
    mockAuthHook.mockClear();

    // Initialize execute functions in action definitions
    Object.values(actionDefs).forEach(actionDef => {
      if (actionDef.execute) {
        actionDef.execute.mockClear();
      }
    });

    useGenericAction = createUseGenericAction({
      actionDefs,
      useQueryClient: () => useQueryClient,
      useTranslation: mockTranslationHook,
      useNavigation: mockNavigationHook,
      useAuth: mockAuthHook,
      showAlert: mockShowAlert,
      showConfirm: mockShowConfirm
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Basic Action Creation and Execution', () => {
    test('should create action with static schema', () => {
      const { result } = renderHook(
        () => useGenericAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.schema).toBe(userSchema);
      expect(result.current.form).toBeDefined();
      expect(result.current.start).toBeInstanceOf(Function);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isExecuting).toBe(false);
    });

    test('should execute action with static schema', async () => {
      const { result } = renderHook(
        () => useGenericAction('createUser'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'John Doe';
        result.current.form.email = 'john@example.com';
        result.current.form.age = 30;
      });

      // Execute action
      await act(async () => {
        await result.current.start({
          executionParams: { priority: 'high' }
        });
      });

      expect(genericActionDefs['createUser'].execute).toHaveBeenCalledWith({
        form: expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        }),
        schema: expect.any(Object),
        priority: 'high'
      });

      // Wait for async execution to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.isRunning).toBe(false);
    });

    test('should create action with dynamic schema', () => {
      const { result } = renderHook(
        () => useGenericAction('createUserDynamic', { schemaSelector: { userType: 'admin' } }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.schema).toBeDefined();
      expect(result.current.schema.getForm()).toHaveProperty('role');
      expect(result.current.form).toBeDefined();
    });

    test('should execute action with dynamic schema', async () => {
      const { result } = renderHook(
        () => useGenericAction('createUserDynamic', { schemaSelector: { userType: 'admin' } }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data (according to admin schema)
      act(() => {
        result.current.form.name = 'Admin User';
        result.current.form.email = 'admin@example.com';
        result.current.form.age = 25;
        result.current.form.role = 'admin';
      });

      // Execute action
      await act(async () => {
        await result.current.start({
          executionParams: { userType: 'admin' }
        });
      });

      expect(actionDefs['createUserDynamic'].execute).toHaveBeenCalledWith({
        form: expect.objectContaining({
          name: 'Admin User',
          email: 'admin@example.com',
          age: 25,
          role: 'admin'
        }),
        schema: expect.any(Object),
        userType: 'admin'
      });
    });

    test('should create action without schema', () => {
      const { result } = renderHook(
        () => useGenericAction('createUserNoSchema'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.schema).toBeNull();
      expect(result.current.form).toEqual({});
      expect(result.current.start).toBeInstanceOf(Function);
    });

    test('should execute action without schema', async () => {
      const { result } = renderHook(
        () => useGenericAction('createUserNoSchema'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Execute action
      await act(async () => {
        await result.current.start({
          executionParams: { customData: 'test' }
        });
      });

      expect(actionDefs['createUserNoSchema'].execute).toHaveBeenCalledWith({
        form: {},
        customData: 'test'
      });
    });
  });

  describe('Form Management', () => {
    test('should initialize form with custom initialForm', () => {
      const customInitialForm = { name: 'Default Name', email: 'default@example.com' };

      const { result } = renderHook(
        () => useGenericAction('createUser', { initialForm: customInitialForm }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.form).toEqual(customInitialForm);
    });

    test('should initialize form with initialForm function', () => {
      const initialFormFn = ({ newSchema, oldForm }) => ({
        name: 'Function Name',
        email: 'function@example.com',
        age: 25
      });

      const { result } = renderHook(
        () => useGenericAction('createUser', { initialForm: initialFormFn }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.form).toEqual({
        name: 'Function Name',
        email: 'function@example.com',
        age: 25
      });
    });

    test('should use dynamicSchemaAction with user schema', () => {
      const { result } = renderHook(
        () => useGenericAction('dynamicSchemaAction', { schemaSelector: { schemaType: 'user' } }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.schema).toBeDefined();
      expect(result.current.schema.getForm()).toHaveProperty('name');
      expect(result.current.schema.getForm()).toHaveProperty('email');
      expect(result.current.schema.getForm()).toHaveProperty('age');
    });

    test('should use dynamicSchemaAction with default schema', () => {
      const { result } = renderHook(
        () => useGenericAction('dynamicSchemaAction', { schemaSelector: { schemaType: 'default' } }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.schema).toBeDefined();
      expect(result.current.schema.getForm()).toHaveProperty('type');
      expect(result.current.schema.getForm()).not.toHaveProperty('name');
    });

    test('should handle schema change and reinitialize form', () => {
      const { result, rerender } = renderHook(
        ({ actionKey, schemaSelector }) => useGenericAction(actionKey, { schemaSelector }),
        {
          initialProps: { actionKey: 'createUser', schemaSelector: {} },
          wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
        }
      );

      const initialForm = result.current.form;
      const initialSchema = result.current.schema;

      // Change schema (to dynamic schema)
      rerender({ actionKey: 'createUserDynamic', schemaSelector: { userType: 'admin' } });

      expect(result.current.schema).toBeDefined();
      expect(result.current.schema).not.toBe(initialSchema);
      expect(result.current.schema.getForm()).toHaveProperty('role');
      // Verify form was reinitialized
      expect(result.current.formAssignedAt).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when actionDef.execute is not a function', () => {
      const invalidActionDefs = {
        'invalid.action': {
          schema: userSchema,
          execute: 'not a function'
        }
      };

      const invalidUseGenericAction = createUseGenericAction({
        actionDefs: invalidActionDefs,
        useQueryClient: () => useQueryClient,
        useTranslation: mockTranslationHook,
        useNavigation: mockNavigationHook,
        useAuth: mockAuthHook,
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm
      });

      expect(() => {
        renderHook(
          () => invalidUseGenericAction('invalid.action'),
          { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
        );
      }).toThrow('actionDef.execute must be a function for action: invalid.action');
    });

    test('should handle execute function error', async () => {
      const errorActionDefs = {
        'error.action': {
          schema: userSchema,
          execute: jest.fn(async () => {
            throw new Error('Execution failed');
          })
        }
      };

      const errorUseGenericAction = createUseGenericAction({
        actionDefs: errorActionDefs,
        useQueryClient: () => useQueryClient,
        useTranslation: mockTranslationHook,
        useNavigation: mockNavigationHook,
        useAuth: mockAuthHook,
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm
      });

      const { result } = renderHook(
        () => errorUseGenericAction('error.action'),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      // Set form data
      act(() => {
        result.current.form.name = 'Test User';
        result.current.form.email = 'test@example.com';
      });

      // Execute action that will error
      await act(async () => {
        try {
          await result.current.start();
        } catch (error) {
          expect(error.message).toBe('Execution failed');
        }
      });

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    test('should memoize schemaSource correctly', () => {
      const schemaSelector = { version: 'v1' };

      const { result, rerender } = renderHook(
        ({ schemaSelector }) => useGenericAction('createUserDynamic', { schemaSelector }),
        {
          initialProps: { schemaSelector },
          wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
        }
      );

      const initialSchema = result.current.schema;

      // Re-render with same schemaSelector
      rerender({ schemaSelector });

      // Schema reference should be the same (memoization check)
      expect(result.current.schema).toBe(initialSchema);
    });

    test('should update schemaSource when schemaSelector changes', () => {
      const { result, rerender } = renderHook(
        ({ schemaSelector }) => useGenericAction('createUserDynamic', { schemaSelector }),
        {
          initialProps: { schemaSelector: { userType: 'admin' } },
          wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
        }
      );

      const initialSchema = result.current.schema;

      // Change schemaSelector (admin -> user)
      rerender({ schemaSelector: { userType: 'user' } });

      // Verify schema changed (admin schema has role, user schema doesn't)
      expect(result.current.schema).not.toBe(initialSchema);
      expect(result.current.schema.getForm()).not.toHaveProperty('role');
    });
  });
});
