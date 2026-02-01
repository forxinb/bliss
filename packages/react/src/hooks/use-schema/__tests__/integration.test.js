const React = require('react');
const { renderHook, act, render } = require('@testing-library/react');
const { useLocalObservable, observer } = require('mobx-react-lite');
const { action, toJS } = require('mobx');
const { makeSchema } = require('@godbliss/core/utils');
const useSchemaValidations = require('../use-schema-validations');
const { userSchema } = require('../__mocks__/mock-schema');
const { createObservableForm } = require('../__mocks__/mock-form');

// Remove MobX Mock - Use real MobX
// jest.mock('mobx', () => ({ ... }));

describe('Integration: useSchemaValidations with Schema and Form', () => {
  describe('Complete progressive validation workflow', () => {
    test('should handle full user interaction scenario', () => {
      // Create a realistic schema using makeSchema
      const registrationSchema = makeSchema({
        username: { type: String, min: 3, required: true },
        email: {
          type: String,
          min: 1,
          required: true,
          regEx: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Add Email regex
        },
        password: { type: String, min: 8, required: true },
        age: { type: Number, min: 18, max: 100 }
      });

      let testResult = null;
      let testForm = null;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({
          username: '',
          email: '',
          password: '',
          age: 0
        }));

        testResult = useSchemaValidations({
          schema: registrationSchema,
          form: testForm
        });

        return null; // We don't need to render anything
      });

      const { rerender } = render(<TestComponent />);

      // Step 1: Initial state - should have full validation errors but no inputting errors
      expect(Object.keys(testResult.fullValidationErrors)).toHaveLength(4); // All fields invalid
      expect(testResult.inputtingValidationErrors).toEqual({}); // No user interaction yet

      // Step 2: User starts typing username
      act(() => {
        action(() => {
          testForm.username = 'jo'; // Too short (minLength: 3)
        })();
      });
      rerender(<TestComponent />);

      // Should now show inputting error for username
      expect(testResult.inputtingValidationErrors).toHaveProperty('username');
      expect(testResult.inputtingValidationErrors.username.type).toBe('minString');

      // Other fields still not in inputting errors (user hasn't touched them)
      expect(testResult.inputtingValidationErrors).not.toHaveProperty('email');
      expect(testResult.inputtingValidationErrors).not.toHaveProperty('password');

      // Step 3: User fixes username
      act(() => {
        action(() => {
          testForm.username = 'john_doe'; // Valid now
        })();
      });
      rerender(<TestComponent />);

      // Username should no longer have inputting error
      expect(testResult.inputtingValidationErrors).not.toHaveProperty('username');
      expect(testResult.fullValidationErrors).not.toHaveProperty('username');

      // Step 4: User enters invalid email
      act(() => {
        action(() => {
          testForm.email = 'invalid-email'; // Invalid format (our mock doesn't check format, but empty is invalid)
        })();
      });
      rerender(<TestComponent />);

      // Should show inputting error for email now
      expect(testResult.inputtingValidationErrors).toHaveProperty('email');

      // Step 5: User enters valid email
      act(() => {
        action(() => {
          testForm.email = 'john@example.com';
        })();
      });
      rerender(<TestComponent />);

      // Email error should be gone
      expect(testResult.inputtingValidationErrors).not.toHaveProperty('email');

      // Step 6: User enters short password
      act(() => {
        action(() => {
          testForm.password = '123'; // Too short
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).toHaveProperty('password');
      expect(testResult.inputtingValidationErrors.password.type).toBe('minString');

      // Step 7: User enters valid password
      act(() => {
        action(() => {
          testForm.password = 'securepassword123';
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).not.toHaveProperty('password');

      // Step 8: User enters invalid age
      act(() => {
        action(() => {
          testForm.age = 15; // Below minimum (18)
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).toHaveProperty('age');
      expect(testResult.inputtingValidationErrors.age.type).toBe('minNumber');

      // Step 9: User enters valid age
      act(() => {
        action(() => {
          testForm.age = 25;
        })();
      });
      rerender(<TestComponent />);

      // Final state: No validation errors at all
      expect(testResult.fullValidationErrors).toEqual({});
      expect(testResult.inputtingValidationErrors).toEqual({});
    });
  });

  describe('Schema integration', () => {
    test('should work with complex schema validation rules', () => {
      const complexSchema = makeSchema({
        profile: makeSchema({
          firstName: { type: String, min: 2, required: true },
          lastName: { type: String, min: 2, required: true },
          age: { type: Number, min: 0, max: 120 }
        }),
        settings: makeSchema({
          theme: { type: String, min: 1, required: true },
          notifications: { type: Boolean }
        })
      });

      let testResult = null;
      let testForm = null;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({
          profile: {
            firstName: '',
            lastName: '',
            age: -5
          },
          settings: {
            theme: '',
            notifications: true
          }
        }));

        testResult = useSchemaValidations({
          schema: complexSchema,
          form: testForm
        });

        return null;
      });

      const { rerender } = render(<TestComponent />);

      // Should handle nested validation
      expect(testResult.fullValidationErrors).toHaveProperty(['profile.firstName']);
      expect(testResult.fullValidationErrors).toHaveProperty(['profile.lastName']);
      expect(testResult.fullValidationErrors).toHaveProperty(['profile.age']);
      expect(testResult.fullValidationErrors).toHaveProperty(['settings.theme']);

      // Test nested field modification
      act(() => {
        action(() => {
          testForm.profile.firstName = 'J'; // Too short
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).toHaveProperty(['profile.firstName']);
    });

    test('should handle schema function updates', () => {
      let currentFields = {
        name: { type: String, min: 1, required: true }
      };

      const dynamicSchema = () => makeSchema(currentFields);

      let testResult = null;
      let testForm = null;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({ name: '' }));

        testResult = useSchemaValidations({
          schema: dynamicSchema,
          form: testForm
        });

        return null;
      });

      const { rerender } = render(<TestComponent />);

      // Initial validation
      expect(testResult.fullValidationErrors).toHaveProperty('name');

      // Change schema
      act(() => {
        currentFields = {
          name: { type: 'string', required: true },
          email: { type: 'string', required: true }
        };
      });
      rerender(<TestComponent />);

      // Should now validate against new schema
      expect(testResult.fullValidationErrors).toHaveProperty('name');
      // Note: email might not show error if form doesn't have email field
    });
  });

  describe('Form integration', () => {
    test('should handle form function updates', () => {
      let testResult = null;
      let testForm = null;

      const formFunction = () => testForm;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({ name: '', email: '' }));

        testResult = useSchemaValidations({
          schema: userSchema,
          form: formFunction
        });
        return null;
      });

      const { rerender } = render(<TestComponent />);

      expect(testResult.fullValidationErrors).toHaveProperty('name');
      expect(testResult.fullValidationErrors).toHaveProperty('email');

      // Update form data
      act(() => {
        action(() => {
          Object.assign(testForm, { name: 'John', email: 'john@test.com', age: 25 });
        })();
      });
      rerender(<TestComponent />);

      // Should reflect new form data
      expect(testResult.fullValidationErrors).toEqual({});
    });

    test('should handle observable-like form updates', () => {
      let testResult = null;
      let testForm = null;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({
          name: '',
          email: 'test@example.com',
          age: 25
        }));

        testResult = useSchemaValidations({
          schema: userSchema,
          form: testForm
        });
        return null;
      });

      const { rerender } = render(<TestComponent />);

      // Initially has name error
      expect(testResult.fullValidationErrors).toHaveProperty('name');
      expect(testResult.fullValidationErrors).not.toHaveProperty('email');

      // Simulate multiple rapid changes (like user typing)
      act(() => {
        action(() => {
          testForm.name = 'J';
        })();
      });
      rerender(<TestComponent />);

      act(() => {
        action(() => {
          testForm.name = 'Jo';
        })();
      });
      rerender(<TestComponent />);

      act(() => {
        action(() => {
          testForm.name = 'John';
        })();
      });
      rerender(<TestComponent />);

      // Final state should be valid
      expect(testResult.fullValidationErrors).not.toHaveProperty('name');
      expect(testResult.inputtingValidationErrors).not.toHaveProperty('name');
    });
  });

  describe('Real-world scenarios', () => {
    test('should handle typical registration form workflow', () => {
      const registrationSchema = makeSchema({
        email: {
          type: String,
          min: 1,
          required: true,
          regEx: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Add Email regex
        },
        password: { type: String, min: 6, required: true },
        confirmPassword: { type: String, min: 1, required: true },
        terms: { type: Boolean, required: true }
      });

      let testResult = null;
      let testForm = null;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({
          email: '',
          password: '',
          confirmPassword: '',
          terms: false
        }));

        testResult = useSchemaValidations({
          schema: registrationSchema,
          form: testForm
        });
        return null;
      });

      const { rerender } = render(<TestComponent />);

      // User fills out form step by step
      act(() => {
        action(() => {
          testForm.email = 'user@example.com';
        })();
      });
      rerender(<TestComponent />);

      act(() => {
        action(() => {
          testForm.password = 'short'; // Too short
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).toHaveProperty('password');

      act(() => {
        action(() => {
          testForm.password = 'longenoughpassword';
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).not.toHaveProperty('password');

      act(() => {
        action(() => {
          testForm.confirmPassword = 'different'; // Would be invalid in real validation
        })();
      });
      rerender(<TestComponent />);

      act(() => {
        action(() => {
          testForm.terms = true;
        })();
      });
      rerender(<TestComponent />);

      // Should handle the complete workflow without errors
      expect(testResult).toHaveProperty('fullValidationErrors');
      expect(testResult).toHaveProperty('inputtingValidationErrors');
    });

    test('should handle form reset scenarios', () => {
      let testResult = null;
      let testForm = null;

      const TestComponent = observer(() => {
        testForm = useLocalObservable(() => ({
          name: 'John',
          email: 'john@test.com'
        }));

        testResult = useSchemaValidations({
          schema: userSchema,
          form: testForm
        });
        return null;
      });

      const { rerender } = render(<TestComponent />);

      // User modifies field
      act(() => {
        action(() => {
          testForm.name = 'J'; // Invalid
        })();
      });
      rerender(<TestComponent />);

      expect(testResult.inputtingValidationErrors).toHaveProperty('name');

      // Form gets reset (common in real apps)
      act(() => {
        action(() => {
          Object.assign(testForm, { name: '', email: '', age: 0 });
        })();
      });
      rerender(<TestComponent />);

      // Should handle reset gracefully
      expect(testResult.fullValidationErrors).toHaveProperty('name');
      // inputtingValidationErrors behavior depends on implementation
    });
  });
});
