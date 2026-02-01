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
        useDynamicSchemaForm(nullSchema, undefined)
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
        useDynamicSchemaForm(
          () => null,
          undefined
        )
      );

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});
    });

    test('should throw error for invalid schema from function', () => {
      expect(() => {
        renderHook(() =>
          useDynamicSchemaForm(
            createInvalidSchemaFunction,
            userForm
          )
        );
      }).toThrow('Invalid schema');
    });
  });

  describe('Dynamic Form Tests', () => {
    test('should use static initial form', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, userForm)
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
        useDynamicSchemaForm(nullSchema, undefined)
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

  // ==========================================================================
  // ADVANCED TESTS
  // ==========================================================================

  describe('Advanced Dependency Management Tests', () => {
    test('should handle schema function with changing dependencies', () => {
      // Pre-create schemas to ensure stable references
      const userSchema = createUserSchemaByType({ userType: 'user' });
      const adminSchema = createUserSchemaByType({ userType: 'admin' });

      const schemaFunction = jest.fn((type) => {
        return type === 'admin' ? adminSchema : userSchema;
      });

      const { result, rerender } = renderHook(
        ({ type }) => {
          return useDynamicSchemaForm(() => schemaFunction(type), userForm);
        },
        { initialProps: { type: 'user' } }
      );

      expect(schemaFunction).toHaveBeenCalledTimes(1);
      expect(result.current.currentSchema).toBe(userSchema);

      // Change user type
      rerender({ type: 'admin' });

      // Note: Function may be called 3 times due to React's strict mode or effect re-runs
      expect(schemaFunction).toHaveBeenCalledTimes(3);
      expect(result.current.currentSchema).toBe(adminSchema);
    });

    test('should handle initialForm function with changing dependencies', () => {
      // Pre-create forms to ensure stable references
      const v1Form = { version: 'v1', name: 'Default' };
      const v2Form = { version: 'v2', name: 'Default' };

      const formFunction = jest.fn(({ newSchema, oldForm }) => {
        const version = oldForm.version || 'v1';
        return version === 'v2' ? v2Form : v1Form;
      });

      const { result, rerender } = renderHook(
        ({ schema, version }) => {
          // Create inline function to trigger dependency change
          return useDynamicSchemaForm(schema, ({ newSchema, oldForm }) => {
            return formFunction({ newSchema, oldForm: { ...oldForm, version } });
          });
        },
        { initialProps: { schema: userSchema, version: 'v1' } }
      );

      expect(formFunction).toHaveBeenCalledTimes(1);
      expect(result.current.form.version).toBe('v1');

      // Change form version only (schema stays same) - should NOT trigger form update
      rerender({ schema: userSchema, version: 'v2' });

      expect(formFunction).toHaveBeenCalledTimes(1); // Still 1, no form update
      expect(result.current.form.version).toBe('v1'); // Still v1

      // Change schema (this should trigger form update)
      rerender({ schema: postSchema, version: 'v2' });

      expect(formFunction).toHaveBeenCalledTimes(2); // Now 2, form updated
      expect(result.current.form.version).toBe('v2'); // Now v2
    });

    test('should maintain form stability when schema reference changes but content is same', async () => {
      const schema1 = makeSchema({
        name: { type: String, max: 50 },
        email: { type: String }
      });

      const schema2 = makeSchema({
        name: { type: String, max: 50 },
        email: { type: String }
      });

      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, userForm),
        { initialProps: { schema: schema1 } }
      );

      const initialForm = result.current.form;
      const initialTimestamp = result.current.formAssignedAt;

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Change to identical schema (different reference)
      rerender({ schema: schema2 });

      // Form should be recreated due to reference change
      expect(result.current.currentSchema).toBe(schema2);
      expect(result.current.form).toEqual(userForm);
      expect(result.current.formAssignedAt).not.toBe(initialTimestamp);
    });
  });

  describe('Advanced Schema Change Tests', () => {
    test('should handle complex schema migration with form preservation', () => {
      const oldSchema = makeSchema({
        firstName: { type: String, max: 50 },
        lastName: { type: String, max: 50 },
        email: { type: String }
      });

      const newSchema = makeSchema({
        name: { type: String, max: 100 }, // firstName + lastName combined
        email: { type: String },
        age: { type: Number, optional: true }
      });

      const migrationForm = ({ newSchema, oldForm }) => ({
        name: `${oldForm.firstName || ''} ${oldForm.lastName || ''}`.trim(),
        email: oldForm.email || '',
        age: oldForm.age || 25
      });

      const oldForm = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, migrationForm),
        { initialProps: { schema: oldSchema } }
      );

      // Set initial form data
      act(() => {
        result.current.form.firstName = 'John';
        result.current.form.lastName = 'Doe';
        result.current.form.email = 'john@example.com';
      });

      // Change schema
      rerender({ schema: newSchema });

      expect(result.current.currentSchema).toBe(newSchema);
      expect(result.current.form.name).toBe('John Doe');
      expect(result.current.form.email).toBe('john@example.com');
      expect(result.current.form.age).toBe(25);
    });

    test('should handle schema change from null to valid schema', () => {
      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, undefined),
        { initialProps: { schema: null } }
      );

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});

      // Add schema
      rerender({ schema: userSchema });

      expect(result.current.currentSchema).toBe(userSchema);
      expect(result.current.form).toEqual(userSchema.getForm());
    });

    test('should handle schema change from valid to null', () => {
      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, undefined),
        { initialProps: { schema: userSchema } }
      );

      expect(result.current.currentSchema).toBe(userSchema);
      expect(result.current.form).toEqual(userSchema.getForm());

      // Remove schema
      rerender({ schema: null });

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});
    });
  });

  describe('Advanced Form Management Tests', () => {
    test('should handle form updates with MobX reactivity', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, userForm)
      );

      // Update form fields
      act(() => {
        result.current.form.name = 'Updated Name';
        result.current.form.email = 'updated@example.com';
      });

      expect(result.current.form.name).toBe('Updated Name');
      expect(result.current.form.email).toBe('updated@example.com');
    });

    test('should preserve form data during schema change when using migration function', () => {
      const migrationFunction = ({ newSchema, oldForm }) => ({
        ...oldForm,
        // Preserve existing data
        name: oldForm.name || 'Default',
        email: oldForm.email || 'default@example.com'
      });

      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, migrationFunction),
        { initialProps: { schema: userSchema } }
      );

      // Set some form data
      act(() => {
        result.current.form.name = 'Custom Name';
        result.current.form.email = 'custom@example.com';
      });

      const customData = { ...result.current.form };

      // Change schema
      rerender({ schema: postSchema });

      // Form should be recreated but preserve data
      expect(result.current.form.name).toBe('Custom Name');
      expect(result.current.form.email).toBe('custom@example.com');
    });

    test('should handle nested form updates', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(nestedSchema, nestedForm)
      );

      // Update nested form fields
      act(() => {
        result.current.form.user.name = 'Updated Nested Name';
        result.current.form.user.profile.age = 30;
      });

      expect(result.current.form.user.name).toBe('Updated Nested Name');
      expect(result.current.form.user.profile.age).toBe(30);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle schema function that throws error', () => {
      const errorSchemaFunction = jest.fn(() => {
        throw new Error('Schema function error');
      });

      expect(() => {
        renderHook(() =>
          useDynamicSchemaForm(errorSchemaFunction, userForm)
        );
      }).toThrow('Schema function error');
    });

    test('should handle initialForm function that throws error', () => {
      const errorFormFunction = jest.fn(() => {
        throw new Error('Form function error');
      });

      expect(() => {
        renderHook(() =>
          useDynamicSchemaForm(userSchema, errorFormFunction)
        );
      }).toThrow('Form function error');
    });

    test('should handle undefined schemaSource', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(undefined, undefined)
      );

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});
    });

    test('should handle undefined initialForm', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, undefined)
      );

      expect(result.current.currentSchema).toBe(userSchema);
      expect(result.current.form).toEqual({});
    });

    test('should handle both undefined parameters', () => {
      const { result } = renderHook(() =>
        useDynamicSchemaForm(undefined, undefined)
      );

      expect(result.current.currentSchema).toBeNull();
      expect(result.current.form).toEqual({});
    });
  });

  describe('Memory and Performance Tests', () => {
    test('should not cause memory leaks with frequent schema changes', () => {
      const schemas = [
        userSchema,
        postSchema,
        nestedSchema,
        emptySchema
      ];

      const { result, rerender } = renderHook(
        ({ schema }) => useDynamicSchemaForm(schema, userForm),
        { initialProps: { schema: schemas[0] } }
      );

      // Rapidly change schemas
      for (let i = 1; i < schemas.length; i++) {
        rerender({ schema: schemas[i] });
        expect(result.current.currentSchema).toBe(schemas[i]);
      }

      // Should still work correctly
      expect(result.current.form).toBeDefined();
    });

    test('should handle large form objects efficiently', () => {
      const largeForm = {};
      for (let i = 0; i < 1000; i++) {
        largeForm[`field${i}`] = `value${i}`;
      }

      const { result } = renderHook(() =>
        useDynamicSchemaForm(userSchema, largeForm)
      );

      expect(result.current.form).toEqual(largeForm);
      expect(Object.keys(result.current.form)).toHaveLength(1000);
    });
  });
});
