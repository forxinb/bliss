/**
 * useGate Hook Integration Tests
 * 
 * Uses renderHook from @testing-library/react for React 19 compatibility.
 * Verifies actual Hook behavior and state changes.
 */
const React = require('react');
const { renderHook } = require('@testing-library/react');
const useGate = require('../use-gate');
const {
  minimalGateDef,
  completeGateDef,
  nestedPathGateDef,
  multiParamGateDef,
  functionGateDef,
  threeLevelGateDefs,
  httpMethodGateDef
} = require('../__mocks__/mock-gate-def-for-use-gate-test');
const {
  basicGateContext,
  gateContextWithRouteParams,
  gateContextWithQueryParams,
  complexGateContext,
  dynamicSchemaGateContext
} = require('../__mocks__/mock-gate-context-for-use-gate-test');

// Note: MobX Mock removed - uses real MobX implementation

// helper: derive whether query parameters are added from urlSuffix
const isQueryParamsAdded = (gate) => gate.urlSuffix.includes('?');

describe('useGate - Integration Tests', () => {
  describe('Basic functionality', () => {
    test('should handle static gateDef correctly', () => {
      const { result } = renderHook(() => useGate(
        minimalGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef).toEqual(minimalGateDef);
      expect(result.current.schema).toBeNull();
      expect(result.current.form).toEqual({});
      expect(result.current.urlSuffix).toBe('/api/users');
      expect(isQueryParamsAdded(result.current)).toBe(false);
      expect(result.current.queryKey).toEqual(['api', 'users']);
    });

    test('should handle complete gateDef with all properties', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef).toEqual(completeGateDef);
      expect(result.current.schema).toBe(completeGateDef.schema);
      expect(result.current.form).toBeDefined();
      expect(result.current.urlSuffix).toBe('/api/users');
      expect(isQueryParamsAdded(result.current)).toBe(false);
      expect(result.current.queryKey).toBeNull(); // POST method should not have queryKey by default
    });

    test('should handle function gateDef correctly', () => {
      // gateDef should be resolved before passing to useGate
      const resolvedGateDef = functionGateDef(dynamicSchemaGateContext.schemaSelector);
      const { result } = renderHook(() => useGate(
        resolvedGateDef,
        dynamicSchemaGateContext
      ));

      expect(result.current.gateDef).toBeDefined();
      expect(result.current.gateDef.method).toBe('GET');
      expect(result.current.gateDef.path).toBe('/api/users/:userId');
      expect(result.current.schema).toBeDefined();
    });
  });

  describe('URL building with route parameters', () => {
    test('should build URL with single route parameter', () => {
      const { result } = renderHook(() => useGate(
        nestedPathGateDef,
        gateContextWithRouteParams
      ));

      expect(result.current.urlSuffix).toBe('/users/507f1f77bcf86cd799439011/feeds');
      expect(isQueryParamsAdded(result.current)).toBe(false);
    });

    test('should build URL with multiple route parameters', () => {
      const { result } = renderHook(() => useGate(
        multiParamGateDef,
        complexGateContext
      ));

      expect(result.current.urlSuffix).toContain('/users/507f1f77bcf86cd799439011/posts/507f1f77bcf86cd799439012');
      expect(isQueryParamsAdded(result.current)).toBe(true); // complexRequest has queryParams
    });

    test('should throw error when route parameter is missing', () => {
      expect(() => {
        renderHook(() => useGate(
          nestedPathGateDef,
          basicGateContext // userId missing
        ));
      }).toThrow('no route param found: :userId');
    });
  });

  describe('URL building with query parameters', () => {
    test('should build URL with query parameters', () => {
      const { result } = renderHook(() => useGate(
        minimalGateDef,
        gateContextWithQueryParams
      ));

      expect(result.current.urlSuffix).toContain('/api/users?');
      expect(result.current.urlSuffix).toContain('page=1');
      expect(result.current.urlSuffix).toContain('limit=10');
      expect(result.current.urlSuffix).toContain('sort=name');
      expect(isQueryParamsAdded(result.current)).toBe(true);
    });

    test('should handle array query parameters', () => {
      const arrayQueryRequest = {
        schemaSelector: {},
        routeParams: {},
        queryParams: {
          tags: ['react', 'javascript'],
          categories: ['frontend', 'backend']
        },
        additionalQueryKey: []
      };

      const { result } = renderHook(() => useGate(
        minimalGateDef,
        arrayQueryRequest
      ));

      expect(result.current.urlSuffix).toContain('tags=["react","javascript"]');
      expect(result.current.urlSuffix).toContain('categories=["frontend","backend"]');
      expect(isQueryParamsAdded(result.current)).toBe(true);
    });

    test('should combine route and query parameters', () => {
      const { result } = renderHook(() => useGate(
        nestedPathGateDef,
        complexGateContext
      ));

      expect(result.current.urlSuffix).toContain('/users/507f1f77bcf86cd799439011/feeds?');
      expect(result.current.urlSuffix).toContain('page=1');
      expect(result.current.urlSuffix).toContain('limit=10');
      expect(isQueryParamsAdded(result.current)).toBe(true);
    });
  });

  describe('Query key generation', () => {
    test('should generate queryKey for GET requests', () => {
      const { result } = renderHook(() => useGate(
        httpMethodGateDef.GET,
        gateContextWithQueryParams
      ));

      // queryKey is generated by splitting URL path
      expect(result.current.queryKey).toEqual(['api', 'users?page=1&limit=10&sort=name&filter=["active","verified"]']);
    });

    test('should not generate queryKey for non-GET requests', () => {
      const { result } = renderHook(() => useGate(
        httpMethodGateDef.POST,
        basicGateContext
      ));

      expect(result.current.queryKey).toBeNull();
    });

    test('should include additionalQueryKey in queryKey', () => {
      const { result } = renderHook(() => useGate(
        httpMethodGateDef.GET,
        complexGateContext
      ));

      expect(result.current.queryKey).toContain('v2');
      expect(result.current.queryKey).toContain('cache');
    });
  });

  describe('3-Level Structure Integration', () => {
    test('should handle complete 3-level gateDefs workflow', () => {
      // Simulate extraction of specific gateDef from 3-level structure
      const gateDef = threeLevelGateDefs['/users']['/:userId'].GET;

      const { result } = renderHook(() => useGate(
        gateDef,
        complexGateContext
      ));

      expect(result.current.gateDef).toEqual(gateDef);
      expect(result.current.urlSuffix).toBe('/users/507f1f77bcf86cd799439011/feeds?page=1&limit=10&include=["posts","comments"]');
      expect(result.current.queryKey).toEqual(['users', '507f1f77bcf86cd799439011', 'feeds?page=1&limit=10&include=["posts","comments"]', 'v2', 'cache']);
    });

    test('should preserve all gateDef properties in return', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      // Ensure all gateDef properties are preserved
      expect(result.current.gateDef.schema).toBe(completeGateDef.schema);
      expect(result.current.gateDef.formPath).toBe(completeGateDef.formPath);
      expect(result.current.gateDef.paramsToForm).toEqual(completeGateDef.paramsToForm);
      expect(result.current.gateDef.contentType).toBe(completeGateDef.contentType);
      expect(result.current.gateDef.lazySchemas).toEqual(completeGateDef.lazySchemas);
      expect(result.current.gateDef.errorSpec).toEqual(completeGateDef.errorSpec);
      expect(result.current.gateDef.successSpec).toEqual(completeGateDef.successSpec);
    });
  });

  describe('HTTP Methods', () => {
    test('should handle all supported HTTP methods', () => {
      const supportedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      supportedMethods.forEach(method => {
        // Use appropriate context for methods requiring route parameters
        const req = method === 'PUT' || method === 'DELETE' || method === 'PATCH'
          ? { schemaSelector: {}, routeParams: { userId: '123' }, queryParams: {}, additionalQueryKey: [] }
          : basicGateContext;

        const { result } = renderHook(() => useGate(
          httpMethodGateDef[method],
          req
        ));

        expect(result.current.gateDef.method).toBe(method);
        expect(result.current.urlSuffix).toBeDefined();
      });
    });

    test('should throw error for unsupported HTTP methods', () => {
      expect(() => {
        renderHook(() => useGate(
          { method: 'HEAD', path: '/api/users' },
          basicGateContext
        ));
      }).toThrow('Not supported methods');
    });
  });

  describe('Form state management', () => {
    test('should initialize form with schema', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.form).toBeDefined();
      expect(result.current.formAssignedAt).toBeDefined();
      expect(typeof result.current.formAssignedAt).toBe('number');
    });

    test('should handle form without schema', () => {
      const { result } = renderHook(() => useGate(
        minimalGateDef,
        basicGateContext
      ));

      expect(result.current.form).toEqual({});
      expect(result.current.schema).toBeNull();
    });
  });
});
