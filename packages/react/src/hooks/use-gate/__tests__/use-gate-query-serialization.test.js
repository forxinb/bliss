/**
 * useGate - Query serialization tests
 */
const { renderHook } = require('@testing-library/react');
const useGate = require('../use-gate');

const gateDef = { method: 'GET', path: '/api/users' };

describe('useGate - Query serialization', () => {
  test('json format: array/object values are JSON stringified', () => {
    const gateContext = {
      schemaSelector: {},
      routeParams: {},
      queryParams: {
        tags: ['react', 'js'],
        filter: { active: true }
      },
      additionalQueryKey: [],
      queryStringFormat: 'json'
    };

    const { result } = renderHook(() => useGate(gateDef, gateContext));
    expect(result.current.urlSuffix).toContain('tags=["react","js"]');
    expect(result.current.urlSuffix).toContain('filter={"active":true}');
  });

  test('standard format: arrays repeat key; objects fallback to JSON with warning', () => {
    const gateContext = {
      schemaSelector: {},
      routeParams: {},
      queryParams: {
        tags: ['react', 'js'],
        filter: { active: true }
      },
      additionalQueryKey: [],
      queryStringFormat: 'standard'
    };

    const { result } = renderHook(() => useGate(gateDef, gateContext));
    const qs = result.current.urlSuffix.split('?')[1];
    expect(qs).toContain('tags=react');
    expect(qs).toContain('tags=js');
    expect(qs).toContain('filter=%7B%22active%22%3Atrue%7D'); // URL-encoded JSON
  });

  test('custom querySerializer has priority over format', () => {
    const gateContext = {
      schemaSelector: {},
      routeParams: {},
      queryParams: { page: 1, sort: 'name' },
      additionalQueryKey: [],
      queryStringFormat: 'json',
      querySerializer: (params) => `p=${params.page}&s=${params.sort}`
    };

    const { result } = renderHook(() => useGate(gateDef, gateContext));
    const qs = result.current.urlSuffix.split('?')[1];
    expect(qs).toBe('p=1&s=name');
  });

  test('empty queryParams -> no question mark in urlSuffix', () => {
    const gateContext = {
      schemaSelector: {},
      routeParams: {},
      queryParams: {},
      additionalQueryKey: [],
      queryStringFormat: 'json'
    };

    const { result } = renderHook(() => useGate(gateDef, gateContext));
    expect(result.current.urlSuffix).toBe('/api/users');
  });
});
