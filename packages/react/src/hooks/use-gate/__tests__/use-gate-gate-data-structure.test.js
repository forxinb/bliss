/**
 * useGate Hook - gateDef structure validation tests
 * 
 * Verifies consistency with gateDefsFromRaw output from gating middleware.
 * Ensures preservation and processing of all gateDef properties.
 */
const React = require('react');
const { renderHook } = require('@testing-library/react');
const useGate = require('../use-gate');
const {
  minimalGateDef,
  completeGateDef,
  invalidGateDef,
  unsupportedMethodGateDef
} = require('../__mocks__/mock-gate-def-for-use-gate-test');
const { basicGateContext } = require('../__mocks__/mock-gate-context-for-use-gate-test');

// Note: MobX Mock removed - uses real MobX implementation
// jest.mock('mobx-react-lite', () => ({ ... }));

describe('useGate - gateDef Structure Validation', () => {
  describe('Basic gateDef properties', () => {
    test('should handle minimal gateDef (method, path only)', () => {
      const { result } = renderHook(() => useGate(
        minimalGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef).toEqual(minimalGateDef);
      expect(result.current.gateDef.method).toBe('GET');
      expect(result.current.gateDef.path).toBe('/api/users');
      expect(result.current.schema).toBeNull();
      expect(result.current.form).toEqual({});
    });

    test('should handle complete gateDef with all properties', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef).toEqual(completeGateDef);

      // Verify all properties
      expect(result.current.gateDef.method).toBe('POST');
      expect(result.current.gateDef.path).toBe('/api/users');
      expect(result.current.gateDef.schema).toBeDefined();
      expect(result.current.gateDef.formPath).toBe('user');
      expect(result.current.gateDef.paramsToForm).toEqual({ 'userId': '_id' });
      expect(result.current.gateDef.contentType).toBe('json');
      expect(result.current.gateDef.lazySchemas).toBeDefined();
      expect(result.current.gateDef.errorSpec).toBeDefined();
      expect(result.current.gateDef.successSpec).toBeDefined();
    });

    test('should preserve schema property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.schema).toBe(completeGateDef.schema);
      expect(result.current.schema).toBe(completeGateDef.schema);
    });

    test('should preserve formPath property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.formPath).toBe('user');
    });

    test('should preserve paramsToForm property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.paramsToForm).toEqual({ 'userId': '_id' });
    });

    test('should preserve contentType property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.contentType).toBe('json');
    });

    test('should preserve lazySchemas property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.lazySchemas).toEqual(completeGateDef.lazySchemas);
    });

    test('should preserve Error property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.errorSpec).toEqual(completeGateDef.errorSpec);
    });

    test('should preserve successSpec property', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      expect(result.current.gateDef.successSpec).toEqual(completeGateDef.successSpec);
    });
  });

  describe('gateDef validation', () => {
    test('should throw error for null gateDef', () => {
      expect(() => {
        renderHook(() => useGate(
          null,
          basicGateContext
        ));
      }).toThrow('Gate not found');
    });

    test('should throw error for undefined gateDef', () => {
      expect(() => {
        renderHook(() => useGate(
          undefined,
          basicGateContext
        ));
      }).toThrow('Not supported methods');
    });

    test('should throw error for invalid gateDef structure', () => {
      expect(() => {
        renderHook(() => useGate(
          invalidGateDef,
          basicGateContext
        ));
      }).toThrow('Not supported methods');
    });

    test('should throw error for unsupported HTTP methods', () => {
      expect(() => {
        renderHook(() => useGate(
          unsupportedMethodGateDef,
          basicGateContext
        ));
      }).toThrow('Not supported methods');
    });
  });

  describe('gateDef with different schemas', () => {
    test('should handle gateDef with function schema', () => {
      const functionSchemaGateData = {
        method: 'GET',
        path: '/api/users/:userId',
        schema: (schemaSelector) => {
          if (schemaSelector.userId) {
            return completeGateDef.schema;
          }
          return minimalGateDef.schema;
        }
      };

      const { result } = renderHook(() => useGate(
        functionSchemaGateData,
        {
          schemaSelector: { userId: '123' },
          routeParams: { userId: '123' },
          queryParams: {},
          additionalQueryKey: []
        }
      ));

      expect(result.current.gateDef).toEqual(functionSchemaGateData);
      expect(result.current.schema).toBeDefined();
    });

    test('should handle gateDef with null schema', () => {
      const nullSchemaGateData = {
        method: 'GET',
        path: '/api/users',
        schema: null
      };

      const { result } = renderHook(() => useGate(
        nullSchemaGateData,
        basicGateContext
      ));

      expect(result.current.gateDef).toEqual(nullSchemaGateData);
      expect(result.current.schema).toBeNull();
      expect(result.current.form).toEqual({});
    });
  });

  describe('gateDef property combinations', () => {
    test('should handle gateDef with only schema and formPath', () => {
      const schemaFormPathGateData = {
        method: 'POST',
        path: '/api/users',
        schema: completeGateDef.schema,
        formPath: 'user'
      };

      const { result } = renderHook(() => useGate(
        schemaFormPathGateData,
        basicGateContext
      ));

      expect(result.current.gateDef.schema).toBe(completeGateDef.schema);
      expect(result.current.gateDef.formPath).toBe('user');
      expect(result.current.schema).toBe(completeGateDef.schema);
    });

    test('should handle gateDef with only paramsToForm', () => {
      const paramsToFormGateData = {
        method: 'GET',
        path: '/api/users/:userId',
        paramsToForm: { 'userId': '_id' }
      };

      const { result } = renderHook(() => useGate(
        paramsToFormGateData,
        {
          schemaSelector: {},
          routeParams: { userId: '123' },
          queryParams: {},
          additionalQueryKey: []
        }
      ));

      expect(result.current.gateDef.paramsToForm).toEqual({ 'userId': '_id' });
      expect(result.current.urlSuffix).toBe('/api/users/123');
    });

    test('should handle gateDef with errorSpec and successSpec only', () => {
      const errorSuccessGateData = {
        method: 'GET',
        path: '/api/users',
        errorSpec: { notFound: { code: 404 } },
        successSpec: { ok: { code: 200 } }
      };

      const { result } = renderHook(() => useGate(
        errorSuccessGateData,
        basicGateContext
      ));

      expect(result.current.gateDef.errorSpec).toEqual({ notFound: { code: 404 } });
      expect(result.current.gateDef.successSpec).toEqual({ ok: { code: 200 } });
    });
  });

  describe('gateDef immutability', () => {
    test('should not modify original gateDef object', () => {
      const originalGateData = { ...completeGateDef };

      renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      // Verify original object is not modified
      expect(completeGateDef).toEqual(originalGateData);
    });

    test('should return same gateDef reference (immutability not required for consumer)', () => {
      const { result } = renderHook(() => useGate(
        completeGateDef,
        basicGateContext
      ));

      // useGate consumes gateDef as read-only, so deep clone is not used to avoid performance overhead.
      // - No properties are modified within the hook.
      // - Design intent: gateDef treated as configuration object.
      // - Follows standard React Hook pattern of returning passed props if unchanged.
      expect(result.current.gateDef).toBe(completeGateDef);
      expect(result.current.gateDef).toEqual(completeGateDef);

      // TODO: Consider immutability in the future if side effects become a concern.
    });
  });
});
