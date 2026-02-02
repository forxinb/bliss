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

describe('createUseAction - check flow', () => {
  let queryClient;
  let useAction;
  let mockShowAlert;
  let mockShowConfirm;
  let mockTranslationHook;
  let mockNavigationHook;
  let mockAuthHook;
  let mockCreateMutationFn;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockShowAlert = jest.fn();
    mockShowConfirm = jest.fn();
    mockTranslationHook = jest.fn(() => ({ t: (v) => v, i18n: { language: 'ko' } }));
    mockNavigationHook = jest.fn(() => ({ goBack: jest.fn(), navigate: jest.fn() }));
    mockAuthHook = jest.fn(() => ({ auth: { id: '1' }, authDataUpdatedAt: Date.now(), authErrorUpdatedAt: null, refetchAuth: jest.fn() }));

    mockCreateMutationFn = jest.fn(() => {
      // Mock mutate function: only need to check if called, so resolve immediately
      return jest.fn(async () => ({ ok: true }));
    });

    jest.clearAllMocks();
  });

  const renderUseAction = (defs) => {
    return createUseGateAction({
      actionDefs: defs,
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
  };

  it('no check: immediately enters confirmAction flow', async () => {
    const defs = {
      noCheckAction: {
        gating: { path: '/users/', method: 'POST' },
        confirmAction: { title: 't', message: 'm' }
      }
    };
    useAction = renderUseAction(defs);

    const { result } = renderHook(
      () => useAction('noCheckAction', { makeGateContext: () => ({ initialForm: { name: 'A', email: 'a@a.com' } }) }),
      { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
    );

    await act(async () => {
      result.current.start();
    });

    // showConfirm should be called at least once through confirmAction
    expect(mockShowConfirm).toHaveBeenCalled();
  });

  it('sync check success: runs confirmAction', async () => {
    const defs = {
      syncOk: {
        gating: { path: '/users/', method: 'POST' },
        check: () => { },
        confirmAction: { title: 't', message: 'm' }
      }
    };
    useAction = renderUseAction(defs);

    const { result } = renderHook(
      () => useAction('syncOk', { makeGateContext: () => ({ initialForm: { name: 'A', email: 'a@a.com' } }) }),
      { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
    );

    await act(async () => {
      result.current.start();
    });

    expect(mockShowConfirm).toHaveBeenCalled();
  });

  it('sync check failure: calls showAlert, does not run confirmAction', async () => {
    const defs = {
      syncFail: {
        gating: { path: '/users/', method: 'POST' },
        check: () => { throw { title: 'Error', message: 'failed' }; },
        confirmAction: { title: 't', message: 'm' },
        alertCheckError: { title: 'Check Error', message: 'Check failed' }
      }
    };
    useAction = renderUseAction(defs);

    const { result } = renderHook(
      () => useAction('syncFail', { makeGateContext: () => ({ initialForm: { name: 'A', email: 'a@a.com' } }) }),
      { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
    );

    await act(async () => {
      result.current.start();
    });

    expect(mockShowAlert).toHaveBeenCalled();
    expect(mockShowConfirm).not.toHaveBeenCalled();
  });

  it('async check success: after resolve, runs confirmAction', async () => {
    const defs = {
      asyncOk: {
        gating: { path: '/users/', method: 'POST' },
        check: async () => { await Promise.resolve(); },
        confirmAction: { title: 't', message: 'm' }
      }
    };
    useAction = renderUseAction(defs);

    const { result } = renderHook(
      () => useAction('asyncOk', { makeGateContext: () => ({ initialForm: { name: 'A', email: 'a@a.com' } }) }),
      { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
    );

    await act(async () => {
      result.current.start();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(mockShowConfirm).toHaveBeenCalled();
  });

  it('async check failure: on reject, calls showAlert, does not run confirmAction', async () => {
    const defs = {
      asyncFail: {
        gating: { path: '/users/', method: 'POST' },
        check: async () => { return Promise.reject({ title: 'Error', message: 'failed' }); },
        confirmAction: { title: 't', message: 'm' },
        alertCheckError: { title: 'Check Error', message: 'Check failed' }
      }
    };
    useAction = renderUseAction(defs);

    const { result } = renderHook(
      () => useAction('asyncFail', { makeGateContext: () => ({ initialForm: { name: 'A', email: 'a@a.com' } }) }),
      { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
    );

    await act(async () => {
      result.current.start();
      await new Promise(r => setTimeout(r, 0));
    });

    expect(mockShowAlert).toHaveBeenCalled();
    expect(mockShowConfirm).not.toHaveBeenCalled();
  });

  it('checkParams: passes runtime arguments', async () => {
    const spy = jest.fn();
    const defs = {
      passParams: {
        gating: { path: '/users/', method: 'POST' },
        check: ({ extra }) => { spy(extra); },
        confirmAction: { title: 't', message: 'm' }
      }
    };
    useAction = renderUseAction(defs);

    const { result } = renderHook(
      () => useAction('passParams', { makeGateContext: () => ({ initialForm: { name: 'A', email: 'a@a.com' } }) }),
      { wrapper: ({ children }) => <TestWrapper queryClient={queryClient}>{children}</TestWrapper> }
    );

    await act(async () => {
      result.current.start({ checkParams: { extra: 'value' } });
      await new Promise(r => setTimeout(r, 0));
    });

    expect(spy).toHaveBeenCalledWith('value');
  });
});
