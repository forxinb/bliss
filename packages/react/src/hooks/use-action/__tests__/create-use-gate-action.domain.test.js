const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { QueryClient, QueryClientProvider, useMutation, useQueryClient } = require('@tanstack/react-query');
const createUseGateAction = require('../create-use-gate-action');
const { actionDefs, terminalDef, userActionDefs, postActionDefs, otherActionDefs } = require('../__mocks__/gate-action-defs');

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

describe('createUseAction - Domain Actions', () => {
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

    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('User Domain Actions', () => {
    it('should handle createUser action', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/users/');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.form).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should handle updateUser action with route params', () => {
      const { result } = renderHook(
        () => useAction('updateUser', { makeGateContext: () => ({ routeParams: { userId: '123' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/users/:userId');
      expect(result.current.gate.gateDef.method).toBe('PUT');
      expect(result.current.gate.urlSuffix).toBe('/users/123');
    });

    it('should handle deleteUser action', () => {
      const { result } = renderHook(
        () => useAction('deleteUser', { makeGateContext: () => ({ routeParams: { userId: '123' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/users/:userId');
      expect(result.current.gate.gateDef.method).toBe('DELETE');
      expect(result.current.gate.urlSuffix).toBe('/users/123');
    });

    it('should validate user form correctly', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.isValidatedForm()).toBe(true);
    });

    it('should reject invalid user form', () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'invalid-email' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.isValidatedForm()).toBe(false);
    });
  });

  describe('Post Domain Actions', () => {
    it('should handle createPost action', () => {
      const { result } = renderHook(
        () => useAction('createPost', { makeGateContext: () => ({ initialForm: { title: 'Test Post', content: 'Test Content', authorId: '123' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/posts/');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.form).toEqual({ title: 'Test Post', content: 'Test Content', authorId: '123' });
    });

    it('should handle updatePost action with route params', () => {
      const { result } = renderHook(
        () => useAction('updatePost', { makeGateContext: () => ({ routeParams: { postId: '456' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/posts/:postId');
      expect(result.current.gate.gateDef.method).toBe('PUT');
      expect(result.current.gate.urlSuffix).toBe('/posts/456');
    });

    it('should handle deletePost action', () => {
      const { result } = renderHook(
        () => useAction('deletePost', { makeGateContext: () => ({ routeParams: { postId: '456' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/posts/:postId');
      expect(result.current.gate.gateDef.method).toBe('DELETE');
      expect(result.current.gate.urlSuffix).toBe('/posts/456');
    });

    it('should handle publishPost action', () => {
      const { result } = renderHook(
        () => useAction('publishPost', { makeGateContext: () => ({ routeParams: { postId: '456' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/posts/:postId/publish');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.gate.urlSuffix).toBe('/posts/456/publish');
    });

    it('should validate post form correctly', () => {
      const { result } = renderHook(
        () => useAction('createPost', { makeGateContext: () => ({ initialForm: { title: 'Test Post', content: 'Test Content', authorId: '123' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.isValidatedForm()).toBe(true);
    });

    it('should reject invalid post form', () => {
      const { result } = renderHook(
        () => useAction('createPost', { makeGateContext: () => ({ initialForm: { title: 'Test Post' } }) }), // Missing content, authorId
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.isValidatedForm()).toBe(false);
    });
  });

  describe('Other Domain Actions (Composite Actions)', () => {
    it('should handle createUserWithPost action', () => {
      const { result } = renderHook(
        () => useAction('createUserWithPost', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com', title: 'First Post', content: 'First Post Content' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/users-with-post/');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.form).toEqual({ name: 'John', email: 'john@example.com', title: 'First Post', content: 'First Post Content' });
    });

    it('should handle systemBackup action', () => {
      const { result } = renderHook(
        () => useAction('systemBackup', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/system/backup');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.gate.urlSuffix).toBe('/system/backup');
    });

    it('should handle experimentalFeature action', () => {
      const { result } = renderHook(
        () => useAction('experimentalFeature', { makeGateContext: () => ({}) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      expect(result.current.gate.gateDef.path).toBe('/experimental/');
      expect(result.current.gate.gateDef.method).toBe('POST');
      expect(result.current.gate.urlSuffix).toBe('/experimental/');
    });
  });

  describe('Domain Action Group Access', () => {
    it('should access user actions through actionDefs', () => {
      expect(actionDefs.createUser).toBeDefined();
      expect(actionDefs.updateUser).toBeDefined();
      expect(actionDefs.deleteUser).toBeDefined();
    });

    it('should access post actions through actionDefs', () => {
      expect(actionDefs.createPost).toBeDefined();
      expect(actionDefs.updatePost).toBeDefined();
      expect(actionDefs.deletePost).toBeDefined();
      expect(actionDefs.publishPost).toBeDefined();
    });

    it('should access other actions through actionDefs', () => {
      expect(actionDefs.createUserWithPost).toBeDefined();
      expect(actionDefs.systemBackup).toBeDefined();
      expect(actionDefs.experimentalFeature).toBeDefined();
    });

    it('should maintain domain separation in actionDefs', () => {
      // Verify userActionDefs actions are included in actionDefs
      Object.keys(userActionDefs).forEach(actionKey => {
        expect(actionDefs[actionKey]).toBeDefined();
        expect(actionDefs[actionKey]).toEqual(userActionDefs[actionKey]);
      });

      // Verify postActionDefs actions are included in actionDefs
      Object.keys(postActionDefs).forEach(actionKey => {
        expect(actionDefs[actionKey]).toBeDefined();
        expect(actionDefs[actionKey]).toEqual(postActionDefs[actionKey]);
      });

      // Verify otherActionDefs actions are included in actionDefs
      Object.keys(otherActionDefs).forEach(actionKey => {
        expect(actionDefs[actionKey]).toBeDefined();
        expect(actionDefs[actionKey]).toEqual(otherActionDefs[actionKey]);
      });
    });
  });

  describe('Domain Action Execution', () => {
    it('should execute user actions with correct parameters', async () => {
      const { result } = renderHook(
        () => useAction('createUser', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        result.current.start();
      });

      expect(mockCreateMutationFn).toHaveBeenCalledWith('createUser', expect.objectContaining({
        gate: expect.objectContaining({
          gateDef: expect.objectContaining({
            path: '/users/',
            method: 'POST'
          })
        }),
        auth: expect.any(Object)
      }));
    });

    it('should execute post actions with correct parameters', async () => {
      const { result } = renderHook(
        () => useAction('createPost', { makeGateContext: () => ({ initialForm: { title: 'Test Post', content: 'Test Content', authorId: '123' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        result.current.start();
      });

      expect(mockCreateMutationFn).toHaveBeenCalledWith('createPost', expect.objectContaining({
        gate: expect.objectContaining({
          gateDef: expect.objectContaining({
            path: '/posts/',
            method: 'POST'
          })
        }),
        auth: expect.any(Object)
      }));
    });

    it('should execute other actions with correct parameters', async () => {
      const { result } = renderHook(
        () => useAction('createUserWithPost', { makeGateContext: () => ({ initialForm: { name: 'John', email: 'john@example.com' } }) }),
        { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
      );

      await act(async () => {
        result.current.start();
      });

      expect(mockCreateMutationFn).toHaveBeenCalledWith('createUserWithPost', expect.objectContaining({
        gate: expect.objectContaining({
          gateDef: expect.objectContaining({
            path: '/users-with-post/',
            method: 'POST'
          })
        }),
        auth: expect.any(Object)
      }));
    });
  });
});
