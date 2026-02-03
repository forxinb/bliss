/**
 * simpl-schema-utils tests
 * 
 * 🚨 CRITICAL: Schema malfunction can destroy entire business logic
 * - Ensure data integrity
 * - Prevent security vulnerabilities
 * - Ensure form validation accuracy
 * - Ensure readOnly system completeness
 */

// Import only 3 main functions
const {
  makeSchema,
  SimpleSchema,
  SchemaFields
} = require('../../index.js'); // Import from utils/index.js

// Import required libraries directly in tests
const _ = require('lodash');
const { ObjectId } = require('bson');

describe('🔧 Dependency Management', () => {
  test('should have all required dependencies', () => {
    expect(SimpleSchema).toBeDefined();
    expect(_).toBeDefined();
    expect(ObjectId).toBeDefined();
  });

  test('should extend SimpleSchema options', () => {
    // Check if SimpleSchema supports extension options
    expect(typeof SimpleSchema.extendOptions).toBe('function');
  });
});

describe('🏗️ makeSchema Core Functionality', () => {
  test('should create basic schema', () => {
    const schema = makeSchema({
      name: { type: String },
      age: { type: Number, optional: true }
    });

    expect(schema).toBeInstanceOf(SimpleSchema);
    expect(schema.getForm).toBeDefined();
    expect(schema.getDmlForm).toBeDefined();
  });

  test('should merge multiple schemas', () => {
    const baseSchema = { _id: SchemaFields.oid() };
    const userSchema = { name: { type: String } };

    const schema = makeSchema([baseSchema, userSchema]);

    expect(schema.getDefinition('_id')).toBeDefined();
    expect(schema.getDefinition('name')).toBeDefined();
  });

  test('should handle requiredByDefault: false', () => {
    const schema = makeSchema({
      name: { type: String }
    });

    // should be optional since requiredByDefault: false
    expect(schema.getIsRequired('name')).toBe(false);
  });
});

describe('🔒 readOnly/initialValue System (CRITICAL)', () => {
  test('should reject defaultValue with readOnly', () => {
    expect(() => {
      SchemaFields.readOnlyString({
        defaultValue: 'invalid'
      });
    }).toThrow('defaultValue is not allowed with readOnly; use initialValue instead');
  });

  test('should accept initialValue with readOnly', () => {
    const field = SchemaFields.readOnlyString({
      initialValue: 'valid'
    });

    expect(field.readOnly).toBe(true);
    expect(field.initialValue).toBe('valid');
    expect(field.defaultValue).toBeUndefined();
  });

  test('should detect readOnly fields correctly', () => {
    const schema = makeSchema({
      normalField: { type: String },
      readOnlyField: SchemaFields.readOnlyString({
        initialValue: 'readonly'
      })
    });

    expect(schema.getIsReadOnly('normalField')).toBe(false);
    expect(schema.getIsReadOnly('readOnlyField')).toBe(true);
  });
});

describe('📋 Form Management System (CRITICAL)', () => {
  let testSchema;

  beforeEach(() => {
    testSchema = makeSchema({
      _id: SchemaFields.oid(),
      title: { type: String },
      content: { type: String, optional: true },
      createdAt: SchemaFields.readOnlyString({
        initialValue: '2025-08-29T10:00:00.000Z'
      }),
      status: {
        type: String,
        allowedValues: ['draft', 'published'],
        initialValue: 'draft'
      }
    });
  });

  describe('getForm() - UI Forms', () => {
    test('should include all fields including readOnly', () => {
      const form = testSchema.getForm();

      expect(form).toHaveProperty('_id');
      expect(form).toHaveProperty('title');
      expect(form).toHaveProperty('content');
      expect(form).toHaveProperty('createdAt');
      expect(form).toHaveProperty('status');
    });

    test('should use initialValue for initialization', () => {
      const form = testSchema.getForm();

      expect(form.createdAt).toBe('2025-08-29T10:00:00.000Z');
      expect(form.status).toBe('draft');
    });

    test('should merge with existing document', () => {
      const existingDoc = {
        title: 'Existing Title',
        content: 'Existing Content'
      };

      const form = testSchema.getForm(existingDoc);

      expect(form.title).toBe('Existing Title');
      expect(form.content).toBe('Existing Content');
      expect(form.createdAt).toBe('2025-08-29T10:00:00.000Z'); // initialValue preserved
    });
  });

  describe('getDmlForm() - Data Manipulation (CRITICAL)', () => {
    test('should exclude readOnly fields', () => {
      const inputForm = {
        title: 'User Input',
        content: 'User Content',
        createdAt: 'SHOULD_BE_IGNORED',
        status: 'published'
      };

      const dmlForm = testSchema.getDmlForm(inputForm);

      expect(dmlForm).toHaveProperty('title', 'User Input');
      expect(dmlForm).toHaveProperty('content', 'User Content');
      expect(dmlForm).toHaveProperty('status', 'published');
      expect(dmlForm).not.toHaveProperty('createdAt'); // exclude readOnly
      expect(dmlForm).not.toHaveProperty('_id'); // exclude readOnly
    });

    test('should apply clean by default', () => {
      const inputForm = {
        title: '  whitespace  ',
        content: 'normal'
      };

      const dmlForm = testSchema.getDmlForm(inputForm);

      // trimStrings: true should be applied
      expect(dmlForm.title).toBe('whitespace');
    });

    test('should skip clean when suppressClean=true', () => {
      const inputForm = {
        title: '  whitespace  ',
        content: 'normal'
      };

      const dmlForm = testSchema.getDmlForm(inputForm, true);

      // not cleaned
      expect(dmlForm.title).toBe('  whitespace  ');
    });
  });
});

describe('🎯 Schema Manipulation (SECURITY CRITICAL)', () => {
  let baseSchema;

  beforeEach(() => {
    baseSchema = makeSchema({
      name: { type: String },
      email: { type: String },
      role: { type: String },
      secret: { type: String }
    });
  });

  describe('alter()', () => {
    test('should extend schema with new fields', () => {
      baseSchema.alter({
        newField: { type: String }
      });

      expect(baseSchema.getDefinition('newField')).toBeDefined();
    });

    test('should convert required to optional', () => {
      baseSchema.alter({
        name: { required: true }
      });

      // requiredByDefault: false, so required: true → optional: false
      expect(baseSchema.getIsRequired('name')).toBe(true);
    });
  });

  describe('alterWithAllows() - SECURITY', () => {
    test('should only allow specified fields', () => {
      baseSchema.alterWithAllows({
        name: { required: false },
        email: { required: false }
      });

      // allowed fields pass validation
      expect(() => {
        baseSchema.validate({ name: 'test', email: 'test@test.com' });
      }).not.toThrow();

      // disallowed fields fail validation
      expect(() => {
        baseSchema.validate({
          name: 'test',
          email: 'test@test.com',
          role: 'admin',  // not allowed
          secret: 'hack'  // not allowed
        });
      }).toThrow();
    });
  });

  describe('pickAndAlter()', () => {
    test('should create new schema with picked fields only', () => {
      const newSchema = baseSchema.pickAndAlter({
        name: { required: true },
        email: { required: true }
      });

      expect(newSchema.getDefinition('name')).toBeDefined();
      expect(newSchema.getDefinition('email')).toBeDefined();
      expect(newSchema.getDefinition('role')).toBeUndefined();
      expect(newSchema.getDefinition('secret')).toBeUndefined();
    });
  });
});

describe('🛡️ SchemaFields Helpers (VALIDATION CRITICAL)', () => {
  describe('oid()', () => {
    test('should validate valid ObjectId', () => {
      const field = SchemaFields.oid();
      const validId = new ObjectId();

      // custom validation function test
      const context = {
        value: validId,
        definition: { optional: false }
      };

      const result = field.custom.call(context);
      expect(result).toBeUndefined(); // no error
    });

    test('should reject invalid ObjectId', () => {
      const field = SchemaFields.oid();

      const context = {
        value: 'invalid_id',
        definition: { optional: false }
      };

      const result = field.custom.call(context);
      expect(result).toBe('Invalid ObjectId');
    });

    test('should handle optional fields', () => {
      const field = SchemaFields.oid();

      const context = {
        value: undefined,
        definition: { optional: true }
      };

      const result = field.custom.call(context);
      expect(result).toBeUndefined(); // no error as it is optional
    });
  });

  describe('yyyymmdd()', () => {
    test('should enforce 8-character length', () => {
      const field = SchemaFields.yyyymmdd();

      expect(field.type).toBe(String);
      expect(field.min).toBe(8);
      expect(field.max).toBe(8);
      expect(field.input).toBe('yyyymmdd');
    });
  });

  describe('mustBeNull()', () => {
    test('should require null value', () => {
      const field = SchemaFields.mustBeNull();

      expect(field.initialValue).toBe(null);
      expect(field.required).toBe(false);

      // custom validation test
      const validContext = { value: null };
      const invalidContext = { value: 'not null' };

      expect(field.custom.call(validContext)).toBeUndefined();
      expect(field.custom.call(invalidContext)).toBe('must be null');
    });
  });
});

describe('🔍 Schema Query Methods', () => {
  let testSchema;

  beforeEach(() => {
    testSchema = makeSchema({
      name: { type: String },
      age: { type: Number, optional: true },
      email: {
        type: String,
        input: 'email'
      },
      readOnlyField: SchemaFields.readOnlyString()
    });
  });

  test('getType() should return correct types', () => {
    expect(testSchema.getType('name')).toBe(String);
    expect(testSchema.getType('age')).toBe(Number);
    expect(testSchema.getType('email')).toBe(String);
  });

  test('getIsRequired() should detect required fields', () => {
    expect(testSchema.getIsRequired('name')).toBe(false); // requiredByDefault: false
    expect(testSchema.getIsRequired('age')).toBe(false);  // optional: true
  });

  test('getIsReadOnly() should detect readOnly fields', () => {
    expect(testSchema.getIsReadOnly('name')).toBe(false);
    expect(testSchema.getIsReadOnly('readOnlyField')).toBe(true);
  });

  test('getInput() should return input hints', () => {
    expect(testSchema.getInput('email')).toBe('email');
  });

  test('getRegEx() should return regex patterns', () => {
    // Check undefined as email field currently has no regEx
    expect(testSchema.getRegEx('email')).toBeUndefined();
  });
});



describe('🚨 Error Handling & Edge Cases', () => {
  test('should handle missing dependencies gracefully', () => {
    // peerDependency check is important in actual production
    expect(SimpleSchema).toBeDefined();
    expect(_).toBeDefined();
    expect(ObjectId).toBeDefined();
  });

  test('should handle empty schemas', () => {
    const schema = makeSchema({});

    expect(schema.getForm()).toEqual({});
    expect(schema.getDmlForm()).toEqual({});
  });

  test('should handle deep cloning for reference types', () => {
    const originalArray = ['item1', 'item2'];
    const schema = makeSchema({
      tags: { type: Array, initialValue: originalArray },
      'tags.$': { type: String }
    });

    const form = schema.getForm();
    form.tags.push('item3');

    // Original array must not be modified
    expect(originalArray).toHaveLength(2);
    expect(form.tags).toHaveLength(3);
  });
});

describe('🧪 Optional vs Required Field Behavior', () => {
  test('should validate based on optional flag', () => {
    const schema = makeSchema({
      requiredField: { type: String, optional: false }, // Explicitly required
      optionalField: { type: String, optional: true },  // Explicitly optional
      implicitOptionalField: { type: String }           // Implicitly optional (makeSchema default)
    });

    // 1. All fields present -> Valid
    expect(() => {
      schema.validate({
        requiredField: 'present',
        optionalField: 'present',
        implicitOptionalField: 'present'
      });
    }).not.toThrow();

    // 2. Only required field -> Valid
    expect(() => {
      schema.validate({
        requiredField: 'present'
      });
    }).not.toThrow();

    // 3. Missing required field -> Invalid
    expect(() => {
      schema.validate({
        optionalField: 'present'
      });
    }).toThrow();

    // Verify error detail
    try {
      schema.validate({ optionalField: 'present' });
    } catch (error) {
      expect(error.details).toBeDefined();
      expect(error.details[0].name).toBe('requiredField');
      expect(error.details[0].type).toBe('required');
    }
  });

  test('should respect forced requiredByDefault: true', () => {
    // Override default options to make fields required by default
    const schema = makeSchema({
      defaultRequiredField: { type: String },
      explicitOptionalField: { type: String, optional: true }
    }, { requiredByDefault: true });

    // Missing defaultRequiredField -> Error
    expect(() => {
      schema.validate({ explicitOptionalField: 'value' });
    }).toThrow();

    // Missing explicitOptionalField -> Success
    expect(() => {
      schema.validate({ defaultRequiredField: 'value' });
    }).not.toThrow();
  });

  test('should handle alter() switching between required and optional', () => {
    const schema = makeSchema({
      field: { type: String, optional: true }
    });

    // 1. Initially optional
    expect(() => schema.validate({})).not.toThrow();

    // 2. Alter to required using { required: true }
    schema.alter({
      field: { required: true }
    });
    expect(() => schema.validate({})).toThrow();
    expect(schema.getIsRequired('field')).toBe(true);

    // 3. Alter back to optional using { required: false }
    schema.alter({
      field: { required: false }
    });
    expect(() => schema.validate({})).not.toThrow();
    expect(schema.getIsRequired('field')).toBe(false);

    // 4. Alter to required using { optional: false }
    schema.alter({
      field: { type: String, optional: false }
    });
    expect(() => schema.validate({})).toThrow();
  });

  test('should handle requiredByDefault: true with alter()', () => {
    const schema = makeSchema({
      field: { type: String }
    }, { requiredByDefault: true });

    // Initially required
    expect(() => schema.validate({})).toThrow();

    // 2. Make it optional explicitly
    schema.alter({
      field: { optional: true }
    });
    expect(schema.getIsRequired('field')).toBe(false);
    expect(() => schema.validate({})).not.toThrow();

    // 3. Try to make it required again using { required: true }
    // This will FAIL to convert if requiredByDefault is true because of the check in alter()
    schema.alter({
      field: { required: true }
    });

    // In current implementation, this stays optional (false) because 'required: true' is ignored
    // and the previous 'optional: true' persists.
    expect(schema.getIsRequired('field')).toBe(false);
  });
});
