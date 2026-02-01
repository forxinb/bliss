/**
 * useSchemaInputs tests
 * 
 * 🚨 IMPORTANT: Mock Usage Principles and Rationale
 * 
 * 1. The Nature of formFieldRenderer
 *    - formFieldRenderer is a render function producing actual UI in React/React Native
 *    - It's a complex function containing React-specific logic, not just a simple data object
 *    - Contains React lifecycle features like useState, useEffect, event handling, state management
 * 
 * 2. Why Avoid Complex Mocks
 *    - Passing Mock tests ≠ Guarding actual behavior in React environment
 *    - Hard to reproduce React lifecycle, event handling, state changes with Mocks
 *    - As Mocks get complex, risk of divergence from real behavior increases
 *    - Reduces test maintainability and potentially lowers reliability
 * 
 * 3. Correct Test Strategy
 *    - Mock: Verify basic structure only (is it a function? do default props exist?)
 *    - Integration Test: Verify behavior in real React environment
 *    - User interactions, state changes, render optimizations should be tested in real environment
 * 
 * 4. Redefining Mock's Role
 *    - Mock only simple data returns
 *    - Do not mock complex React logic
 *    - Use Mocks only for structural validation
 * 
 * 📚 Reference: dev-docs/lessons-learned/test-failure-handling-pattern-issue.md
 * "Do not modify code on test failure" - Basic principle of AI collaboration
 */

const React = require('react');
const { renderHook, act, render } = require('@testing-library/react');
const { useLocalObservable, observer } = require('mobx-react-lite');
const { runInAction } = require('mobx');
const useSchemaInputs = require('../use-schema-inputs');
const {
  userSchema,
  simpleSchema,
  nestedSchema,
  complexSchema,
  readOnlySchema,
  allowedValuesSchema,
  regexSchema
} = require('../__mocks__/mock-schema');
const {
  simpleForm,
  complexSchemaForm,
  nestedSchemaForm,
  readOnlyForm,
  allowedValuesForm,
  regexForm,
  createObservableForm
} = require('../__mocks__/mock-form');
const {
  mockCreateFormFieldRenderer,
  mockCreateFormFieldRendererByType,
  mockCreateFormFieldRendererWithError
} = require('../__mocks__/mock-create-form-field-renderer');
const {
  MockDebug,
  MockDebugNull,
  MockDebugWithError
} = require('../__mocks__/mock-debug');

describe('useSchemaInputs', () => {
  describe('Basic functionality', () => {
    test('should return correct structure with valid schema', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current).toHaveProperty('formFieldRenderers');
      expect(result.current).toHaveProperty('useFullValidations');
      expect(result.current).toHaveProperty('setUseFullValidations');
      expect(result.current).toHaveProperty('renderDebug');
      expect(typeof result.current.formFieldRenderers).toBe('object');
      expect(typeof result.current.useFullValidations).toBe('boolean');
      expect(typeof result.current.setUseFullValidations).toBe('function');
      expect(typeof result.current.renderDebug).toBe('function');
    });

    test('should throw error when invalid schema is provided', () => {
      expect(() => {
        renderHook(() => useSchemaInputs({ schema: {} }));
      }).toThrow();

      expect(() => {
        renderHook(() => useSchemaInputs({ schema: null }));
      }).toThrow();
    });

    test('should handle schema as function', () => {
      const schemaFunction = () => simpleSchema;

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: schemaFunction,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.formFieldRenderers).toBeDefined();
      expect(Object.keys(result.current.formFieldRenderers)).toContain('title');
    });

    test('should handle form as function', () => {
      const formFunction = () => simpleForm;

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          form: formFunction,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.formFieldRenderers).toBeDefined();
    });

    test('should handle createFormFieldRenderer as function', () => {
      const createFormFieldRendererFunction = () => mockCreateFormFieldRenderer();

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: createFormFieldRendererFunction
        })
      );

      expect(result.current.formFieldRenderers).toBeDefined();
    });
  });

  describe('Schema handling', () => {
    test('should process simple schema correctly', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;
      expect(fields.title).toBeDefined();
      expect(typeof fields.title).toBe('function'); // formFieldRenderer MUST be a function

      // Call formFieldRenderer and check result
      const titleField = fields.title();
      expect(titleField.path).toBe('title');
      expect(titleField.fieldType).toBe(String);
    });

    test('should process complex schema with metadata', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: complexSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;

      // Check string field with metadata
      expect(fields.title).toBeDefined();
      expect(typeof fields.title).toBe('function');
      const titleField = fields.title();
      expect(titleField.label).toBe('Title');
      expect(titleField.help).toBe('Enter the title');
      expect(titleField.remark).toBe('Required field');

      // Check number field
      expect(fields.count).toBeDefined();
      expect(typeof fields.count).toBe('function');
      const countField = fields.count();
      expect(countField.fieldType).toBe(Number);

      // Check boolean field
      expect(fields.isActive).toBeDefined();
      expect(typeof fields.isActive).toBe('function');
      const isActiveField = fields.isActive();
      expect(isActiveField.fieldType).toBe(Boolean);
    });

    test('should handle readOnly fields correctly', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: readOnlySchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;
      expect(fields.id().readOnly).toBe(true);
      expect(fields.name().readOnly).toBe(false);
      expect(fields.createdAt().readOnly).toBe(true);
    });

    test('should handle allowed values correctly', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: allowedValuesSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;
      expect(fields.status().allowedValues).toEqual(['draft', 'published', 'archived']);
      expect(fields.priority().allowedValues).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle regex patterns correctly', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: regexSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;
      expect(fields.phone().regEx).toBeInstanceOf(RegExp);
      expect(fields.zipCode().regEx).toBeInstanceOf(RegExp);
      expect(fields.username().regEx).toBeInstanceOf(RegExp);
    });
  });

  describe('Form field generation', () => {
    test('should generate render functions for all schema fields', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: complexSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;
      const expectedFields = ['title', 'description', 'count', 'isActive', 'tags', 'metadata'];

      expectedFields.forEach(fieldName => {
        expect(fields[fieldName]).toBeDefined();
        expect(typeof fields[fieldName]).toBe('function');
      });
    });

    test('should pass correct field configuration to createFormFieldRenderer', () => {
      const mockCreateFormFieldRendererSpy = jest.fn().mockReturnValue({ type: 'mock-field' });

      renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRendererSpy
        })
      );

      expect(mockCreateFormFieldRendererSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'title',
          type: String,
          required: true,
          readOnly: false
        })
      );
    });

    test('should handle different field types correctly', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: complexSchema,
          createFormFieldRenderer: mockCreateFormFieldRendererByType
        })
      );

      const fields = result.current.formFieldRenderers;
      expect(fields.title().type).toBe('text-input');
      expect(fields.count().type).toBe('number-input');
      expect(fields.isActive().type).toBe('checkbox');
    });
  });

  describe('Nested schema support', () => {
    test('should handle nested object schemas', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: nestedSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;

      // Check that nested schema is processed
      expect(fields.user).toBeDefined();
      expect(typeof fields.user).toBe('object'); // Nested schema returns as object

      // Check nested field paths (nested schema is object, leaf fields are functions)
      expect(fields.user.name().path).toBe('user.name');
      expect(fields.user.profile.age().path).toBe('user.profile.age');
    });

    test('should generate correct paths for nested fields', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: nestedSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const fields = result.current.formFieldRenderers;

      // Check path generation (All fields must call render function)
      expect(fields.user.name().path).toBe('user.name');
      expect(fields.user.profile.age().path).toBe('user.profile.age');
    });
  });

  describe('Validation error handling', () => {
    test('should pass validation errors via holder', () => {
      const fullValidationErrors = { title: { message: 'Title is required' } };
      const inputtingValidationErrors = { title: { message: 'Title is required' } };

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer,
          fullValidationErrors,
          inputtingValidationErrors
        })
      );

      // Check that validation errors are accessible through getValidationErrors
      const titleField = result.current.formFieldRenderers.title();
      const validationErrors = titleField.getValidationErrors();
      expect(validationErrors).toEqual(inputtingValidationErrors);
    });

    test('should switch validation errors based on useFullValidations state', () => {
      const fullValidationErrors = { title: { message: 'Title is required' } };
      const inputtingValidationErrors = { title: { message: 'Title is required' } };

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer,
          fullValidationErrors,
          inputtingValidationErrors
        })
      );

      // Initially should use inputtingValidationErrors
      let titleField = result.current.formFieldRenderers.title();
      let validationErrors = titleField.getValidationErrors();
      expect(validationErrors).toEqual(inputtingValidationErrors);

      // Switch to full validations
      act(() => {
        result.current.setUseFullValidations(true);
      });

      // Should now use fullValidationErrors
      titleField = result.current.formFieldRenderers.title();
      validationErrors = titleField.getValidationErrors();
      expect(validationErrors).toEqual(fullValidationErrors);
    });
  });

  describe('State management', () => {
    test('should initialize useFullValidations as false', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.useFullValidations).toBe(false);
    });

    test('should toggle useFullValidations state', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.useFullValidations).toBe(false);

      act(() => {
        result.current.setUseFullValidations(true);
      });

      expect(result.current.useFullValidations).toBe(true);

      act(() => {
        result.current.setUseFullValidations(false);
      });

      expect(result.current.useFullValidations).toBe(false);
    });

    test('should maintain state between renders', () => {
      const { result, rerender } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      act(() => {
        result.current.setUseFullValidations(true);
      });

      expect(result.current.useFullValidations).toBe(true);

      rerender();

      expect(result.current.useFullValidations).toBe(true);
    });
  });

  describe('Debug functionality', () => {
    test('should render debug component with correct props', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          form: simpleForm,
          createFormFieldRenderer: mockCreateFormFieldRenderer,
          Debug: MockDebug
        })
      );

      const debugElement = result.current.renderDebug({ form: simpleForm });
      expect(debugElement).toBeDefined();
      expect(debugElement.type).toBe("div");  // Type of JSX returned by MockDebug
    });

    test('should pass correct props to debug component', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          form: simpleForm,
          createFormFieldRenderer: mockCreateFormFieldRenderer,
          Debug: MockDebug
        })
      );

      const debugElement = result.current.renderDebug({ form: simpleForm });
      const debugProps = debugElement.props;

      expect(debugProps.form).toEqual(simpleForm);
      expect(debugProps.formFieldRenderers).toBeDefined();
      expect(debugProps.useFullValidations).toBe(false);
      expect(typeof debugProps.setUseFullValidations).toBe('function');
    });

    test('should handle debug component that returns null', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          Debug: MockDebugNull
        })
      );

      const debugElement = result.current.renderDebug({ form: {} });
      expect(debugElement).toBeNull();
    });

    test('should handle debug component with additional params', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          Debug: MockDebug
        })
      );

      const additionalParams = { customParam: 'test' };
      const debugElement = result.current.renderDebug(additionalParams);

      expect(debugElement.props.customParam).toBe('test');
    });
  });

  describe('Error handling', () => {
    test('should handle createFormFieldRenderer that throws error', () => {
      expect(() => {
        renderHook(() =>
          useSchemaInputs({
            schema: simpleSchema,
            createFormFieldRenderer: mockCreateFormFieldRendererWithError
          })
        );
      }).toThrow('Mock error for field: title');
    });

    test('should handle debug component that throws error', () => {
      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          Debug: MockDebugWithError
        })
      );

      expect(() => {
        result.current.renderDebug({ form: {} });
      }).toThrow('Mock Debug component error');
    });
  });

  describe('Performance and memoization', () => {
    test('should memoize formFieldRenderers based on schema', () => {
      const { result, rerender } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      const firstRenderFields = result.current.formFieldRenderers;

      rerender();

      const secondRenderFields = result.current.formFieldRenderers;

      // Should be the same reference due to memoization
      expect(secondRenderFields).toBe(firstRenderFields);
    });

    test('should recreate formFieldRenderers when schema changes', () => {
      const { result, rerender } = renderHook(
        ({ schema }) => useSchemaInputs({
          schema,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        }),
        { initialProps: { schema: simpleSchema } }
      );

      const firstRenderFields = result.current.formFieldRenderers;

      rerender({ schema: complexSchema });

      const secondRenderFields = result.current.formFieldRenderers;

      // Should be different references due to schema change
      expect(secondRenderFields).not.toBe(firstRenderFields);
    });

    test('should maintain formFieldRenderers reference when form changes', () => {
      const { result, rerender } = renderHook(
        ({ form }) => useSchemaInputs({
          schema: simpleSchema,
          form,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        }),
        { initialProps: { form: simpleForm } }
      );

      const firstRenderFields = result.current.formFieldRenderers;

      rerender({ form: { title: 'Different Title' } });

      const secondRenderFields = result.current.formFieldRenderers;

      // Should be the same reference since schema didn't change
      expect(secondRenderFields).toBe(firstRenderFields);
    });
  });

  describe('Integration with MobX', () => {
    test('should work with MobX observable forms', () => {
      const observableForm = createObservableForm(simpleForm);

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          form: observableForm,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.formFieldRenderers).toBeDefined();
      expect(Object.keys(result.current.formFieldRenderers)).toContain('title');
    });

    test('should handle MobX form updates', () => {
      const observableForm = createObservableForm(simpleForm);

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: simpleSchema,
          form: observableForm,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      // Update form data
      act(() => {
        observableForm.title = 'Updated Title';
      });

      // formFieldRenderers should still work (though form changes don't affect memoization)
      expect(result.current.formFieldRenderers.title).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    test('should handle schema with no object keys', () => {
      const schemaWithoutKeys = { objectKeys: () => [] };

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: schemaWithoutKeys,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.formFieldRenderers).toEqual({});
    });

    test('should handle schema with empty object keys', () => {
      const schemaWithEmptyKeys = { objectKeys: () => [] };

      const { result } = renderHook(() =>
        useSchemaInputs({
          schema: schemaWithEmptyKeys,
          createFormFieldRenderer: mockCreateFormFieldRenderer
        })
      );

      expect(result.current.formFieldRenderers).toEqual({});
    });
  });
});
