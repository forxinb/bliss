/**
 * useGate Hook - Dynamic schema tests
 * 
 * Verifies form re-initialization logic on schema changes
 * Validates functional schemas and schemaSelector handling
 */
const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const useGate = require('../use-gate');
const { makeSchema, SimpleSchema } = require('@godbliss/core/utils');
const { userSchema, userWithIdSchema, getDynamicSchema } = require('../__mocks__/mock-schema-for-use-gate-test');
const { basicGateContext, dynamicSchemaGateContext } = require('../__mocks__/mock-gate-context-for-use-gate-test');

describe('useGate - Dynamic Schema', () => {
  describe('Function schema with schemaSelector', () => {
    test('should handle function schema with schemaSelector', () => {
      const functionSchemaGateData = {
        method: 'GET',
        path: '/api/users/:userId',
        schema: getDynamicSchema, // Uses mock-schema logic
        paramsToForm: { 'userId': '_id' }
      };

      const { result } = renderHook(() => useGate(
        functionSchemaGateData,
        dynamicSchemaGateContext
      ));

      expect(result.current.gateDef).toEqual(functionSchemaGateData);
      expect(result.current.schema).toBeDefined();
      expect(result.current.schema).toBe(userWithIdSchema); // userWithIdSchema because userId is present
    });

    test('should handle function schema without userId in schemaSelector', () => {
      const functionSchemaGateData = {
        method: 'GET',
        path: '/api/users',
        schema: getDynamicSchema
      };

      const { result } = renderHook(() => useGate(
        functionSchemaGateData,
        basicGateContext
      ));

      expect(result.current.schema).toBe(userSchema); // userSchema because userId is missing
    });

    test('should handle function schema with complex schemaSelector', () => {
      const complexSchemaSelector = {
        userId: '123',
        includePosts: true,
        version: 'v2'
      };

      const functionSchemaGateData = {
        method: 'GET',
        path: '/api/users/:userId',
        schema: (selector) => {
          if (selector.userId && selector.includePosts) {
            return userWithIdSchema;
          }
          return userSchema;
        }
      };

      const { result } = renderHook(() => useGate(
        functionSchemaGateData,
        {
          schemaSelector: complexSchemaSelector,
          routeParams: { userId: '123' },
          queryParams: {},
          additionalQueryKey: []
        }
      ));

      expect(result.current.schema).toBe(userWithIdSchema);
    });
  });

  describe('Schema changes and form reinitialization', () => {
    test('should update formAssignedAt on schema change', async () => {
      const initialGateData = {
        method: 'GET',
        path: '/api/users',
        schema: userSchema
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: initialGateData } }
      );

      const initialFormAssignedAt = result.current.formAssignedAt;

      // Change schema
      const newGateData = {
        method: 'GET',
        path: '/api/users',
        schema: userWithIdSchema
      };

      // Resolved timing issues by delaying render slightly. 
      // Since new Date().getTime() is in ms, this test may fail probabilistically without the await below 
      // when multiple schema changes happen within the same ms.

      // TODO: Consider a more fundamental fix if rapid re-initialization (multiple times per ms) is a real-world case.
      // ISSUE: Potential delay due to setFormAssignedAt call inside mobxAction
      // - setFormAssignedAt is called within mobxAction and might not reflect immediately.
      // - Might leak out of act() scope causing race conditions in tests.
      // - Need to move setFormAssignedAt outside mobxAction or introduce synchronization mechanism.
      // 📚 Detailed context: todos/tech-enhancement/mobx-action-formassignedat-timing-issue.md
      await new Promise(resolve => setTimeout(resolve, 2));

      act(() => {
        rerender({ gateDef: newGateData });
      });

      expect(result.current.formAssignedAt).not.toBe(initialFormAssignedAt);
      expect(result.current.formAssignedAt).toBeGreaterThan(initialFormAssignedAt);
    });

    test('should reinitialize form when schema changes', () => {
      const initialGateData = {
        method: 'GET',
        path: '/api/users',
        schema: userSchema
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: initialGateData } }
      );

      const initialForm = result.current.form;

      // Change schema
      const newGateData = {
        method: 'GET',
        path: '/api/users',
        schema: userWithIdSchema
      };

      act(() => {
        rerender({ gateDef: newGateData });
      });

      // Verify if form is re-initialized
      expect(result.current.form).not.toBe(initialForm);
      expect(result.current.schema).toBe(userWithIdSchema);
    });

    test('should handle schema change from null to schema', () => {
      const nullSchemaGateData = {
        method: 'GET',
        path: '/api/users',
        schema: null
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: nullSchemaGateData } }
      );

      expect(result.current.schema).toBeNull();
      expect(result.current.form).toEqual({});

      // Add schema
      const withSchemaGateData = {
        method: 'GET',
        path: '/api/users',
        schema: userSchema
      };

      act(() => {
        rerender({ gateDef: withSchemaGateData });
      });

      expect(result.current.schema).toBe(userSchema);
      expect(result.current.form).toBeDefined();
    });

    test('should handle schema change from schema to null', () => {
      const withSchemaGateData = {
        method: 'GET',
        path: '/api/users',
        schema: userSchema
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: withSchemaGateData } }
      );

      expect(result.current.schema).toBe(userSchema);
      expect(result.current.form).toBeDefined();

      // Remove schema
      const nullSchemaGateData = {
        method: 'GET',
        path: '/api/users',
        schema: null
      };

      act(() => {
        rerender({ gateDef: nullSchemaGateData });
      });

      expect(result.current.schema).toBeNull();
      expect(result.current.form).toEqual({});
    });
  });

  describe('Dynamic schema with different scenarios', () => {
    test('should handle schemaSelector changes', () => {
      const functionSchemaGateData = {
        method: 'GET',
        path: '/api/users/:userId',
        schema: getDynamicSchema
      };

      const { result, rerender } = renderHook(
        ({ req }) => useGate(
          functionSchemaGateData,
          req
        ),
        {
          initialProps: {
            req: {
              schemaSelector: {},
              routeParams: { userId: '123' },
              queryParams: {},
              additionalQueryKey: []
            }
          }
        }
      );

      expect(result.current.schema).toBe(userSchema); // userSchema because userId is missing

      // Add userId to schemaSelector
      act(() => {
        rerender({
          req: {
            schemaSelector: { userId: '123' },
            routeParams: { userId: '123' },
            queryParams: {},
            additionalQueryKey: []
          }
        });
      });

      expect(result.current.schema).toBe(userWithIdSchema); // userWithIdSchema because userId is present
    });

    test('should handle multiple schema changes in sequence', () => {
      const functionSchemaGateData = {
        method: 'GET',
        path: '/api/users/:userId',
        schema: (schemaSelector) => {
          if (schemaSelector.includePosts) {
            return userSchema;
          }
          if (schemaSelector.userId) {
            return userWithIdSchema;
          }
          return makeSchema({}); // Return empty schema
        }
      };

      const { result, rerender } = renderHook(
        ({ req }) => useGate(
          functionSchemaGateData,
          req
        ),
        {
          initialProps: {
            req: {
              schemaSelector: {},
              routeParams: { userId: '123' },
              queryParams: {},
              additionalQueryKey: []
            }
          }
        }
      );

      expect(result.current.schema).toBeInstanceOf(SimpleSchema);

      // Add userId
      act(() => {
        rerender({
          req: {
            schemaSelector: { userId: '123' },
            routeParams: { userId: '123' },
            queryParams: {},
            additionalQueryKey: []
          }
        });
      });

      expect(result.current.schema).toBe(userWithIdSchema);

      // Add includePosts
      act(() => {
        rerender({
          req: {
            schemaSelector: { userId: '123', includePosts: true },
            routeParams: { userId: '123' },
            queryParams: {},
            additionalQueryKey: []
          }
        });
      });

      expect(result.current.schema).toBe(userSchema);
    });
  });

  describe('Form state with dynamic schema', () => {
    test('should test MobX observable reference behavior', () => {
      const initialGateData = {
        method: 'POST',
        path: '/api/users',
        schema: userSchema,
        formPath: 'user'
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: initialGateData } }
      );

      const initialForm = result.current.form;
      const initialFormAssignedAt = result.current.formAssignedAt;

      // Re-render with identical gateDef
      act(() => {
        rerender({ gateDef: initialGateData });
      });

      // Test referential equality of MobX observable objects
      console.log('initialForm:', initialForm);
      console.log('currentForm:', result.current.form);
      console.log('initialForm === currentForm:', initialForm === result.current.form);
      console.log('initialFormAssignedAt === currentFormAssignedAt:', initialFormAssignedAt === result.current.formAssignedAt);

      // Reference maintained due to useLocalObservable dependency array
      expect(result.current.form).toBe(initialForm);

      // Content should be same (using toStrictEqual)
      expect(result.current.form).toStrictEqual(initialForm);
      expect(result.current.formAssignedAt).toBe(initialFormAssignedAt);
    });

    test('should maintain form state across schema changes', () => {
      const initialGateData = {
        method: 'POST',
        path: '/api/users',
        schema: userSchema,
        formPath: 'user'
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: initialGateData } }
      );

      const initialForm = result.current.form;
      const initialFormAssignedAt = result.current.formAssignedAt;

      // Re-render with same schema (effectively no change)
      act(() => {
        rerender({ gateDef: initialGateData });
      });

      // Verify form state is maintained (reference also maintained due to useLocalObservable)
      expect(result.current.form).toBe(initialForm);
      expect(result.current.form).toStrictEqual(initialForm);
      expect(result.current.formAssignedAt).toBe(initialFormAssignedAt);
    });

    test('should handle form initialization with different schemas', () => {
      const schema1GateData = {
        method: 'POST',
        path: '/api/users',
        schema: userSchema,
        formPath: 'user'
      };

      const { result, rerender } = renderHook(
        ({ gateDef }) => useGate(
          gateDef,
          basicGateContext
        ),
        { initialProps: { gateDef: schema1GateData } }
      );

      const form1 = result.current.form;

      // Change to different schema
      const schema2GateData = {
        method: 'POST',
        path: '/api/users',
        schema: userWithIdSchema,
        formPath: 'user'
      };

      act(() => {
        rerender({ gateDef: schema2GateData });
      });

      const form2 = result.current.form;

      // Verify that different form is created for different schema
      expect(form2).not.toBe(form1);
      expect(result.current.schema).toBe(userWithIdSchema);
    });
  });
});
