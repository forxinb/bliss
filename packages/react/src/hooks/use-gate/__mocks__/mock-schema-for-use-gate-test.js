/**
 * Mock Schema for useGate Hook testing
 */
const { makeSchema } = require('@godbliss/core/utils');

// Base user schema
const userSchema = makeSchema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  }
});

// User schema with ID
const userWithIdSchema = makeSchema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  }
});

// Post schema
const postSchema = makeSchema({
  _id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  authorId: {
    type: String,
    required: true
  }
});

// Dynamic schema retrieval function
const getDynamicSchema = (schemaSelector) => {
  if (schemaSelector && schemaSelector.userId) {
    return userWithIdSchema;
  }
  return userSchema;
};

// Complex schema (nested structure)
const complexSchema = makeSchema({
  user: {
    type: Object,
    required: true
  },
  'user.name': {
    type: String,
    required: true
  },
  'user.email': {
    type: String,
    required: true
  },
  metadata: {
    type: Object,
    optional: true
  },
  'metadata.createdAt': {
    type: Date,
    optional: true
  }
});

module.exports = {
  userSchema,
  userWithIdSchema,
  postSchema,
  getDynamicSchema,
  complexSchema
};
