/**
 * Mock schemas for useDynamicSchemaForm Hook testing
 * 
 * Provides both static schemas and dynamic schema functions
 */
const { makeSchema } = require('@godbliss/core/utils');

// ==========================================================================
// Static Schemas
// ==========================================================================

// Base user schema
const userSchema = makeSchema({
  name: {
    type: String,
    max: 50,
    required: true
  },
  email: {
    type: String,
    regEx: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    required: true
  },
  age: {
    type: Number,
    min: 0,
    max: 150,
    optional: true
  }
});

// Post schema
const postSchema = makeSchema({
  title: {
    type: String,
    max: 100,
    required: true
  },
  content: {
    type: String,
    max: 500,
    required: true
  },
  published: {
    type: Boolean,
    optional: true
  }
});

// Nested schema
const nestedSchema = makeSchema({
  user: makeSchema({
    name: {
      type: String,
      max: 50,
      required: true
    },
    profile: makeSchema({
      age: {
        type: Number,
        min: 0,
        optional: true
      },
      bio: {
        type: String,
        max: 200,
        optional: true
      }
    })
  })
});

// Empty schema (no fields)
const emptySchema = makeSchema({});

// ==========================================================================
// Dynamic Schema Functions
// ==========================================================================

// Schema function based on user type
const createUserSchemaByType = (userType) => {
  const baseSchema = {
    name: { type: String, max: 50, required: true },
    email: { type: String, regEx: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, required: true }
  };

  switch (userType) {
    case 'admin':
      return makeSchema({
        ...baseSchema,
        role: { type: String, allowedValues: ['admin', 'super-admin'], required: true },
        permissions: { type: Array, optional: true }
      });
    case 'user':
      return makeSchema({
        ...baseSchema,
        age: { type: Number, min: 0, max: 150, optional: true }
      });
    case 'guest':
      return makeSchema({
        name: { type: String, max: 50, optional: true }
      });
    default:
      return makeSchema(baseSchema);
  }
};

// Schema function based on version
const createSchemaByVersion = (version) => {
  switch (version) {
    case 'v1':
      return makeSchema({
        title: { type: String, max: 100, required: true }
      });
    case 'v2':
      return makeSchema({
        title: { type: String, max: 100, required: true },
        description: { type: String, max: 200, optional: true }
      });
    case 'v3':
      return makeSchema({
        title: { type: String, max: 100, required: true },
        description: { type: String, max: 200, optional: true },
        tags: { type: Array, optional: true }
      });
    default:
      return makeSchema({
        title: { type: String, max: 100, required: true }
      });
  }
};

// Conditional schema function
const createConditionalSchema = (options) => {
  const { hasId, isPublished, includeMetadata } = options || {};

  const baseFields = {
    title: { type: String, max: 100, required: true },
    content: { type: String, max: 500, required: true }
  };

  if (hasId) {
    baseFields._id = { type: String, required: true };
  }

  if (isPublished) {
    baseFields.publishedAt = { type: Date, required: true };
    baseFields.published = { type: Boolean, required: true };
  }

  if (includeMetadata) {
    baseFields.metadata = makeSchema({
      author: { type: String, max: 50, optional: true },
      category: { type: String, max: 30, optional: true }
    });
  }

  return makeSchema(baseFields);
};

// ==========================================================================
// Invalid Schemas (for error testing)
// ==========================================================================

const invalidSchema = { not: 'a schema' };
const nullSchema = null;
const undefinedSchema = undefined;

// Functions returning invalid schemas
const createInvalidSchemaFunction = () => invalidSchema;
const createNullSchemaFunction = () => nullSchema;

module.exports = {
  // Static schemas
  userSchema,
  postSchema,
  nestedSchema,
  emptySchema,

  // Dynamic schema functions
  createUserSchemaByType,
  createSchemaByVersion,
  createConditionalSchema,

  // Invalid schemas
  invalidSchema,
  nullSchema,
  undefinedSchema,
  createInvalidSchemaFunction,
  createNullSchemaFunction
};
