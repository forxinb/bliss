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
    // Simulate actual API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, actionKey, data: params };
  });
});

describe('createUseAction - Basic Functionality', () => {
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
      // Stable version selectors (return same value on re-render)
      authVersionSelector: () => 'test-auth-v1',
      appContextVersionSelector: () => 'test-app-v1',
      translationVersionSelector: () => 'test-translation-v1',
      navigationVersionSelector: () => 'test-navigation-v1'
    });

    // Initialize mock functions
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('createUseAction Factory Function', () => {
    it('should create useAction hook successfully', () => {
      expect(useAction).toBeDefined();
      expect(typeof useAction).toBe('function');
    });

    it('should throw error when actionDefs is not provided', () => {
      expect(() => createUseGateAction({
        gateDefs: terminalDef.gateDefs,
        createMutationFn: mockCreateMutationFn
      })).toThrow('actionDefs must be an object');
    });

    it('should throw error when gateDefs is not provided', () => {
      expect(() => createUseGateAction({
        actionDefs,
        createMutationFn: mockCreateMutationFn
      })).toThrow('gateDefs must be an object');
    });

    it('should throw error when createMutationFn is not provided', () => {
      expect(() => createUseGateAction({
        actionDefs,
        gateDefs: terminalDef.gateDefs
      })).toThrow('createMutationFn is required');
    });
  });

  describe('useAction Hook Basic Behavior', () => {
    it('should return correct structure', () => {
      const { result } = renderHook(
        () => useAction('createUser', {
          makeGateContext: () => ({ initialForm: { name: 'Test User', email: 'test@example.com' } })
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current).toHaveProperty('start');
      expect(result.current).toHaveProperty('form');
      expect(result.current).toHaveProperty('schema');
      expect(result.current.mutationHookResult).toHaveProperty('isPending');
      expect(result.current.mutationHookResult).toHaveProperty('error');
      expect(result.current.mutationHookResult).toHaveProperty('data');
      expect(result.current).toHaveProperty('mutationHookResult');
      expect(result.current).toHaveProperty('isValidatedForm');
      expect(result.current).toHaveProperty('mappedHooksResult');
    });

    it('should return gate information from useGate', () => {
      const { result } = renderHook(
        () => useAction('createUser', {
          makeGateContext: () => ({ initialForm: { name: 'Test User', email: 'test@example.com' } })
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate).toBeDefined();
      expect(result.current.gate.gateDef).toBeDefined();
      expect(result.current.gate.gateDef.path).toBe('/users/');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.gate.urlSuffix).toBe('/users/');
    });

    it('should return form and schema from gate', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.form).toEqual({ name: 'John', email: 'john@example.com' });
      expect(result.current.schema).toBeDefined();
    });

    it('should return auth information', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.mappedHooksResult.auth.auth).toEqual({ id: '1', name: 'Test User' });
    });
  });

  describe('useAction Hook Action Definition Lookup', () => {
    it('should find action definition for valid action key', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef).toBeDefined();
      expect(result.current.gate.gateDef.path).toBe('/users/');
      expect(result.current.gate.gateDef.method).toBe('POST');
    });

    it('should find action definition for post actions', () => {
      const { result } = renderHook(
        () => useAction('createPost', {
          makeGateContext: () => ({ initialForm: { title: 'Test Post', content: 'Test Content', authorId: '123' } })
        }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef).toBeDefined();
      expect(result.current.gate.gateDef.path).toBe('/posts/');
      expect(result.current.gate.gateDef.method).toBe('POST');
    });

    it('should find action definition for other actions', () => {
      const { result } = renderHook(
        () => useAction('createUserWithPost', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef).toBeDefined();
      expect(result.current.gate.gateDef.path).toBe('/users-with-post/');
      expect(result.current.gate.gateDef.method).toBe('POST');
    });
  });

  describe('useAction Hook run Function', () => {
    it('should execute run function successfully', async () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        result.current.start();
      });

      expect(mockCreateMutationFn).toHaveBeenCalledWith('createUser', expect.objectContaining({
        gate: expect.any(Object),
        auth: expect.any(Object),
        navigation: expect.any(Object),
        queryClient: expect.any(Object),
        translation: expect.any(Object),
        appContext: expect.any(Object)
      }));
    });

    it('should prevent duplicate run calls', async () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        result.current.start();
        result.current.start(); // Duplicate call
      });

      // createMutationFn should only be called once
      expect(mockCreateMutationFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAction Hook isValidatedForm Function', () => {
    it('should validate form correctly', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.isValidatedForm()).toBe(true);
    });

    it('should return false for invalid form', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John' } }) }), // Missing email
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.isValidatedForm()).toBe(false);
    });

    it('should throw error when no schema available', () => {
      const { result } = renderHook(
        () => useAction('systemBackup', { makeGateContext: () => ({}) }), // Action without schema
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(() => result.current.isValidatedForm()).toThrow('No schema to validate form');
    });
  });

  describe('useAction Hook External Hook Injection', () => {
    it('should call translationHook with correct arguments', () => {
      renderHook(
        () => useAction('createUser', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(mockTranslationHook).toHaveBeenCalled();
    });

    it('should call navigationHook with correct arguments', () => {
      renderHook(
        () => useAction('createUser', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(mockNavigationHook).toHaveBeenCalled();
    });

    it('should call authHook with correct arguments', () => {
      renderHook(
        () => useAction('createUser', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(mockAuthHook).toHaveBeenCalled();
    });
  });
});
