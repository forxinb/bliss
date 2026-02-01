/**
 * Mock Schema for gating middleware testing using @godbliss/core
 */
const { makeSchema, SchemaFields } = require('@godbliss/core/utils');
const { ObjectId } = require('@godbliss/core/utils');

// Simple user schema for basic testing
const userSchema = makeSchema({
  name: { 
    type: String, 
    max: 50
  },
  email: { 
    type: String,
    regEx: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  },
  age: { 
    type: Number, 
    min: 0, 
    max: 150,
    optional: true 
  }
}, {
  requiredByDefault: true
});

// Schema with ObjectId for parameter casting tests
const userWithIdSchema = makeSchema({
  _id: SchemaFields.oid(),
  name: { 
    type: String, 
    max: 50 
  },
  email: { 
    type: String 
  }
}, {
  requiredByDefault: true
});

// Schema with nested objects
const nestedUserSchema = makeSchema({
  user: makeSchema({
    name: { 
      type: String,
      max: 50
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
}, {
  requiredByDefault: true
});

// Schema with various field types
const complexSchema = makeSchema({
  title: { 
    type: String,
    max: 100,
    label: 'Title',
    help: 'Enter the title'
  },
  count: { 
    type: Number,
    min: 0,
    max: 1000
  },
  isActive: { 
    type: Boolean
  },
  tags: { 
    type: Array,
    optional: true
  },
  'tags.$': { 
    type: String,
    max: 20
  },
  metadata: { 
    type: Object,
    optional: true
  }
}, {
  requiredByDefault: true
});

// Schema for testing function-based schema
const createDynamicSchema = (formData) => {
  return makeSchema({
    name: { 
      type: String, 
      max: 50 
    },
    isAdmin: { 
      type: Boolean,
      required: false
    },
    type: { 
      type: String,
      allowedValues: formData.isAdmin ? ['admin', 'user'] : ['user']
    }
  }, {
    requiredByDefault: true
  });
};

module.exports = {
  userSchema,
  userWithIdSchema,
  nestedUserSchema,
  complexSchema,
  createDynamicSchema
};
