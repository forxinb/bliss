/**
 * Mock Form data for gating middleware testing
 */
const { ObjectId } = require('@godbliss/core/utils');

// Simple form data
const simpleUserForm = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
};

// Form with ObjectId
const userWithIdForm = {
  _id: new ObjectId(),
  name: 'Jane Doe',
  email: 'jane@example.com'
};

// Nested form data
const nestedUserForm = {
  user: {
    name: 'Nested User',
    profile: {
      age: 25,
      bio: 'Software developer'
    }
  }
};

// Complex form data
const complexForm = {
  title: 'Test Article',
  count: 42,
  isActive: true,
  tags: ['test', 'article'],
  metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  }
};

// Form with formPath structure
const formWithPath = {
  user: {
    name: 'Path User',
    email: 'path@example.com'
  }
};

// Empty form
const emptyForm = {};

// Form with invalid data
const invalidForm = {
  name: 'A', // Too short
  email: 'invalid-email', // Invalid format
  age: -5 // Below minimum
};

// Form for dynamic schema testing
const dynamicForm = {
  name: 'Dynamic User',
  isAdmin: true
};

module.exports = {
  simpleUserForm,
  userWithIdForm,
  nestedUserForm,
  complexForm,
  formWithPath,
  emptyForm,
  invalidForm,
  dynamicForm
};
