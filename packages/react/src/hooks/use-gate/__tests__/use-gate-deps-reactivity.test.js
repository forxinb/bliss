/**
 * useGate - Dependencies reactivity tests
 */
const { renderHook, act } = require('@testing-library/react');
const useGate = require('../use-gate');

const gateDef = { method: 'GET', path: '/users/:userId' };

describe('useGate - Dependencies reactivity', () => {
  test('routeParams internal change triggers urlSuffix update (JSON.stringify deps)', () => {
    const gateContext1 = { schemaSelector: {}, routeParams: { userId: '1' }, queryParams: {}, additionalQueryKey: [] };
    const { result, rerender } = renderHook(({ gateContext }) => useGate(gateDef, gateContext), { initialProps: { gateContext: gateContext1 } });
    expect(result.current.urlSuffix).toBe('/users/1');

    const gateContext2 = { ...gateContext1, routeParams: { userId: '2' } };
    act(() => { rerender({ gateContext: gateContext2 }); });
    expect(result.current.urlSuffix).toBe('/users/2');
  });

  test('queryParams internal change triggers urlSuffix update (JSON.stringify deps)', () => {
    const gateContext1 = { schemaSelector: {}, routeParams: { userId: '1' }, queryParams: { page: 1 }, additionalQueryKey: [] };
    const { result, rerender } = renderHook(({ gateContext }) => useGate(gateDef, gateContext), { initialProps: { gateContext: gateContext1 } });
    expect(result.current.urlSuffix).toContain('/users/1?page=1');

    const gateContext2 = { ...gateContext1, queryParams: { page: 2 } };
    act(() => { rerender({ gateContext: gateContext2 }); });
    expect(result.current.urlSuffix).toContain('/users/1?page=2');
  });

  test('additionalQueryKey content change triggers queryKey update (JSON.stringify deps)', () => {
    const gateContext1 = { schemaSelector: {}, routeParams: { userId: '1' }, queryParams: {}, additionalQueryKey: ['v1'] };
    const { result, rerender } = renderHook(({ gateContext }) => useGate(gateDef, gateContext), { initialProps: { gateContext: gateContext1 } });
    expect(result.current.queryKey).toContain('v1');

    const gateContext2 = { ...gateContext1, additionalQueryKey: ['v2'] };
    act(() => { rerender({ gateContext: gateContext2 }); });
    expect(result.current.queryKey).toContain('v2');
  });
});
