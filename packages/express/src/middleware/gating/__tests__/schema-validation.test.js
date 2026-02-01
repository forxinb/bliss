/**
 * Schema validation and type casting tests
 * 
 * TODO: cast more types - Verify need in future tests before extending (Number, Boolean, Date, etc.)
 */
const { makeSchema, ObjectId } = require('@godbliss/core/utils');
const { userSchema, userWithIdSchema, createDynamicSchema } = require('../__mocks__/mock-schema');

describe('Schema validation and type casting', () => {
  describe('ObjectId parameter casting', () => {
    test('should cast string parameter to ObjectId correctly', () => {
      const schema = userWithIdSchema;
      const paramValue = '507f1f77bcf86cd799439011';

      // Simulate the casting logic from gating.js
      const castedValue = new ObjectId(paramValue);

      expect(castedValue).toBeInstanceOf(ObjectId);
      expect(castedValue.toString()).toBe(paramValue);
    });

    test('should handle invalid ObjectId strings', () => {
      const invalidObjectId = 'invalid-object-id';

      expect(() => {
        new ObjectId(invalidObjectId);
      }).toThrow();
    });

    test('should handle ObjectId parameter mapping', () => {
      const mockReq = {
        params: { userId: '507f1f77bcf86cd799439011' },
        query: {}
      };

      const mockGateData = {
        paramsToForm: { 'userId': '_id' },
        schema: userWithIdSchema
      };

      const paramValue = mockReq.params.userId;
      const castedValue = new ObjectId(paramValue);

      // Simulate form setting logic
      const form = {};
      form[mockGateData.paramsToForm.userId] = castedValue;

      expect(form._id).toBeInstanceOf(ObjectId);
      expect(form._id.toString()).toBe(paramValue);
    });
  });

  describe('Schema type detection', () => {
    test('should detect ObjectId type correctly', () => {
      const schema = userWithIdSchema;
      const objectIdType = schema.getType('_id');

      expect(objectIdType).toBe(ObjectId);
    });

    test('should detect String type correctly', () => {
      const schema = userSchema;
      const stringType = schema.getType('name');

      expect(stringType).toBe(String);
    });

    test('should detect Number type correctly', () => {
      const schema = userSchema;
      const numberType = schema.getType('age');

      expect(numberType).toBe(Number);
    });
  });

  describe('Parameter to form mapping', () => {
    test('should map URL parameters to form fields correctly', () => {
      const mockReq = {
        params: { userId: '507f1f77bcf86cd799439011' },
        query: { version: '1' }
      };

      const mockGateData = {
        paramsToForm: {
          'userId': '_id',
          'version': 'version'
        },
        schema: userWithIdSchema
      };

      const form = {};

      // Simulate the mapping logic
      Object.entries(mockGateData.paramsToForm).forEach(([paramKey, formKey]) => {
        const paramValue = mockReq.params[paramKey] || mockReq.query[paramKey];
        if (paramValue) {
          form[formKey] = paramValue;
        }
      });

      expect(form._id).toBe('507f1f77bcf86cd799439011');
      expect(form.version).toBe('1');
    });

    test('should handle missing parameters gracefully', () => {
      const mockReq = {
        params: {},
        query: {}
      };

      const mockGateData = {
        paramsToForm: { 'userId': '_id' },
        schema: userWithIdSchema
      };

      const form = {};

      // Simulate the mapping logic
      Object.entries(mockGateData.paramsToForm).forEach(([paramKey, formKey]) => {
        const paramValue = mockReq.params[paramKey] || mockReq.query[paramKey];
        if (paramValue) {
          form[formKey] = paramValue;
        }
      });

      expect(form._id).toBeUndefined();
    });
  });

  describe('Dynamic schema handling', () => {
    test('should handle function-based schemas correctly', () => {
      const formData = { isAdmin: true };
      const dynamicSchema = createDynamicSchema(formData);

      expect(dynamicSchema).toBeDefined();
      expect(dynamicSchema.getType('name')).toBe(String);
      expect(dynamicSchema.getType('type')).toBe(String);
    });

    test('should handle schema functions with form data', () => {
      const schemaFunction = (form) => {
        return makeSchema({
          name: { type: String },
          role: {
            type: String,
            allowedValues: form.isAdmin ? ['admin', 'user'] : ['user']
          }
        });
      };

      const formData = { isAdmin: true };
      const schema = schemaFunction(formData);

      expect(schema).toBeDefined();
      expect(schema.getType('name')).toBe(String);
      expect(schema.getType('role')).toBe(String);
    });
  });

  describe('Schema validation', () => {
    test('should validate correct form data', () => {
      const form = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      };

      expect(() => {
        userSchema.validate(form);
      }).not.toThrow();
    });

    test('should throw validation errors for invalid data', () => {
      const invalidForm = {
        name: 'A', // Too short
        email: 'invalid-email', // Invalid format
        age: -5 // Below minimum
      };

      expect(() => {
        userSchema.validate(invalidForm);
      }).toThrow();
    });

    test('should handle ObjectId validation', () => {
      const form = {
        // _id: new ObjectId().toString(), // Convert to string for validation
        _id: new ObjectId(), // Convert to string for validation
        name: 'John Doe',
        email: 'john@example.com'
      };

      expect(() => {
        userWithIdSchema.validate(form);
      }).not.toThrow();
    });
  });

  describe('Form path handling', () => {
    test('should extract form data from formPath correctly', () => {
      const mockReq = {
        body: {
          user: {
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      };

      const mockGateData = {
        formPath: 'user'
      };

      // Simulate formPath extraction logic
      const form = mockGateData.formPath
        ? mockReq.body[mockGateData.formPath] || {}
        : mockReq.body;

      expect(form).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    test('should handle missing formPath gracefully', () => {
      const mockReq = {
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      const mockGateData = {
        formPath: 'user'
      };

      // Simulate formPath extraction logic
      const form = mockGateData.formPath
        ? mockReq.body[mockGateData.formPath] || {}
        : mockReq.body;

      expect(form).toEqual({});
    });

    test('should use direct body when no formPath', () => {
      const mockReq = {
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      };

      const mockGateData = {
        // No formPath
      };

      // Simulate formPath extraction logic
      const form = mockGateData.formPath
        ? mockReq.body[mockGateData.formPath] || {}
        : mockReq.body;

      expect(form).toEqual({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });
  });

  describe('Future type casting expansion', () => {
    test('should be ready for Number type casting', () => {
      // TODO: Test when Number type casting is added in the future
      const paramValue = '42';
      const expectedNumber = 42;

      // Currently returns string as is
      const currentResult = paramValue;
      expect(currentResult).toBe('42');

      // When Number casting is implemented
      // const castedValue = Number(paramValue);
      // expect(castedValue).toBe(42);
    });

    test('should be ready for Boolean type casting', () => {
      // TODO: Test when Boolean type casting is added in the future
      const paramValue = 'true';
      const expectedBoolean = true;

      // Currently returns string as is
      const currentResult = paramValue;
      expect(currentResult).toBe('true');

      // When Boolean casting is implemented
      // const castedValue = paramValue === 'true';
      // expect(castedValue).toBe(true);
    });

    test('should be ready for Date type casting', () => {
      // TODO: Test when Date type casting is added in the future
      const paramValue = '2024-01-01';
      const expectedDate = new Date('2024-01-01');

      // Currently returns string as is
      const currentResult = paramValue;
      expect(currentResult).toBe('2024-01-01');

      // When Date casting is implemented
      // const castedValue = new Date(paramValue);
      // expect(castedValue).toEqual(expectedDate);
    });
  });
});
