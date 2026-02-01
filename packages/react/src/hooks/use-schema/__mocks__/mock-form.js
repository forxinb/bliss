const { ObjectId } = require('@godbliss/core/utils');

/**
 * Mock Form data for testing useSchemaValidations
 */

// Simple form data
const simpleForm = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
};

const emptyForm = {
  name: '',
  email: '',
  age: 0
};

const invalidForm = {
  name: 'J',  // Too short (minLength: 2)
  email: '',  // Required but empty
  age: -5     // Below minimum (min: 0)
};

// Nested form data
const nestedForm = {
  user: {
    name: 'Jane Doe',
    profile: {
      age: 25,
      bio: 'Software developer'
    }
  },
  settings: {
    theme: 'dark',
    notifications: true
  }
};

// Form with arrays and ObjectId (should be excluded from fieldStates)
const complexForm = {
  _id: new ObjectId(),
  name: 'Test User',
  tags: ['tag1', 'tag2', 'tag3'],  // Array - should be excluded
  metadata: {
    createdAt: new Date(),
    updatedAt: new Date()
  },
  items: [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' }
  ]  // Array - should be excluded
};

// Form data for progressive validation testing
const progressiveTestForm = {
  username: 'testuser',
  password: 'password123',
  confirmPassword: 'password123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User'
};

// Form data for complex schema testing (useSchemaInputs)
const complexSchemaForm = {
  title: 'Test Article',
  description: 'This is a test article for testing complex schema',
  count: 42,
  isActive: true,
  tags: ['test', 'article', 'complex'],
  metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02')
  }
};

// Form data for readOnly schema testing
const readOnlyForm = {
  id: 'readonly-123',
  name: 'Read Only Item',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02')
};

// Form data for allowed values schema testing
const allowedValuesForm = {
  status: 'published',
  priority: 3,
  category: 'tech'
};

// Form data for regex schema testing
const regexForm = {
  phone: '+1 (555) 123-4567',
  zipCode: '12345-6789',
  username: 'test_user_123'
};

// Form data for nested schema testing (useSchemaInputs)
const nestedSchemaForm = {
  user: {
    name: 'Nested User',
    profile: {
      age: 30,
      bio: 'This is a nested profile'
    }
  }
};

// Empty form for complex schema
const emptyComplexForm = {
  title: '',
  description: '',
  count: 0,
  isActive: false,
  tags: [],
  metadata: {}
};

// Utility function to create MobX-like observable mock
const createObservableForm = (initialData) => {
  const data = { ...initialData };
  
  return new Proxy(data, {
    get(target, prop) {
      return target[prop];
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
};

module.exports = {
  simpleForm,
  emptyForm,
  invalidForm,
  nestedForm,
  complexForm,
  progressiveTestForm,
  complexSchemaForm,
  readOnlyForm,
  allowedValuesForm,
  regexForm,
  nestedSchemaForm,
  emptyComplexForm,
  createObservableForm
};
