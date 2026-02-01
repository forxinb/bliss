const React = require('react');
const { renderHook, act } = require('@testing-library/react');
const { makeSchema } = require('@godbliss/core/utils');
const useDynamicSchemaForm = require('../use-dynamic-schema-form');

// Use real MobX - no mocking
const { useLocalObservable } = require('mobx-react-lite');
const { toJS, action: mobxAction } = require('mobx');

// Import comprehensive mocks
const {
  userSchema,
  postSchema,
  nestedSchema,
  emptySchema,
  createUserSchemaByType,
  createSchemaByVersion,
  createConditionalSchema,
  invalidSchema,
  nullSchema,
  createInvalidSchemaFunction
} = require('../__mocks__/mock-schema-for-use-dynamic-schema-form-test');

const {
  userForm,
  adminUserForm,
  postForm,
  nestedForm,
  emptyForm,
  partialForm,
  invalidForm,
  createUserFormByType,
  createFormByVersion,
  createConditionalForm,
  migrateFormOnSchemaChange,
  createInvalidFormFunction,
  userTypeSelectors,
  versionSelectors,
  conditionalSelectors
} = require('../__mocks__/mock-form-for-use-dynamic-schema-form-test');

describe('useDynamicSchemaForm', () => {
  describe('Static Schema Tests', () => {
    test('should initialize with user schema', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, userForm)
      );

      expect(result.current.currentSchema).toBe(userSchema);
      expect(result.current.form).toEqual(userForm);
      expect(result.current.formAssignedAt).toBeDefined();
    });

    test('should initialize with post schema', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(postSchema, postForm)
      );

      expect(result.current.currentSchema).toBe(postSchema);
      expect(result.current.form).toEqual(postForm);
    });

    test('should initialize with nested schema', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(nestedSchema, nestedForm)
      );

      expect(result.current.currentSchema).toBe(nestedSchema);
      expect(result.current.form).toEqual(nestedForm);
    });

    test('should handle empty schema', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(emptySchema, emptyForm)
      );

      expect(result.current.currentSchema).toBe(emptySchema);
      expect(result.current.form).toEqual(emptyForm);
    });

    test('should handle null schema', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(nullSchema)
      );

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});
    });

    test('should throw error for invalid schema', () => {
      expect(() => {
        renderHook(() =>
          useDynamicSchemaForm(invalidSchema, userForm)
        );
      }).toThrow('Invalid schema');
    });
  });

  describe('Dynamic Schema Tests', () => {
    test('should initialize with user type schema function', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(
          () => createUserSchemaByType(userTypeSelectors.admin),
          adminUserForm
        )
      );

      expect(result.current.currentSchema).toBeDefined();
      expect(result.current.form).toEqual(adminUserForm);
    });

    test('should initialize with version schema function', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(
          () => createSchemaByVersion(versionSelectors.v2),
          postForm
        )
      );

      expect(result.current.currentSchema).toBeDefined();
      expect(result.current.form).toEqual(postForm);
    });

    test('should handle schema function returning null', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(() => null)
      );

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});
    });

    test('should throw error for invalid schema from function', () => {
      expect(() => {
        renderHook(() =>
          useDynamicSchemaForm(
            createInvalidSchemaFunction,
            userForm,
            'test'
          )
        );
      }).toThrow('Invalid schema');
    });
  });

  describe('Dynamic Form Tests', () => {
    test('should use static initial form', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, userForm, 'test')
      );

      expect(result.current.form).toEqual(userForm);
    });

    test('should use function-based initial form', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, createUserFormByType)
      );

      expect(result.current.form).toBeDefined();
      expect(result.current.form.name).toBeDefined();
      expect(result.current.form.email).toBeDefined();
    });

    test('should handle empty form when no schema', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(nullSchema)
      );

      expect(result.current.form).toEqual({});
    });
  });

  describe('Schema Change Detection Tests', () => {
    test('should detect schema change and reinitialize form', () => {
      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, userForm),
        { initialProps: { schema: userSchema } }
      );

      // Initial state
      expect(result.current.currentSchema).toBe(userSchema);
      expect(result.current.form).toEqual(userForm);

      // Change schema
      rerender({ schema: postSchema });

      expect(result.current.currentSchema).toBe(postSchema);
      expect(result.current.form).toEqual(userForm);
    });

    test('should handle schema change from function to static', () => {
      const schemaFunction = jest.fn(() => userSchema);

      const { result, rerender } = renderHook(
        ({ schemaSource }) => useDynamicSchemaForm(schemaSource, userForm),
        { initialProps: { schemaSource: schemaFunction } }
      );

      // Initial state with function
      expect(result.current.currentSchema).toBe(userSchema);

      // Change to static schema
      rerender({ schemaSource: userSchema });

      expect(result.current.currentSchema).toBe(userSchema);
    });
  });

  describe('Performance Considerations', () => {
    test('should handle inline function for initialForm (performance warning)', () => {
      // This test documents the performance issue mentioned in Decision 012
      const inlineFunction = ({ newSchema, oldForm }) => ({
        name: 'Inline',
        email: 'inline@example.com'
      });

      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, inlineFunction)
      );

      // Should work but may cause performance issues due to dependency array
      expect(result.current.form).toEqual({
        name: 'Inline',
        email: 'inline@example.com'
      });
    });
  });
});
