/**
 * Mock form data for useDynamicSchemaForm Hook testing
 * 
 * Provides both static forms and dynamic form functions
 */
const { ObjectId } = require('@godbliss/core/utils');

// ==========================================================================
// Static Form Data
// ==========================================================================

// Base user form
const userForm = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
};

// Admin user form
const adminUserForm = {
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  permissions: ['read', 'write', 'delete']
};

// Post form
const postForm = {
  title: 'Test Post',
  content: 'This is a test post content.',
  published: true
};

// Nested form
const nestedForm = {
  user: {
    name: 'Jane Doe',
    profile: {
      age: 25,
      bio: 'Software developer'
    }
  }
};

// Empty form
const emptyForm = {};

// Partial form (some fields missing)
const partialForm = {
  name: 'Partial User'
  // email missing
};

// Invalid form (validation failure)
const invalidForm = {
  name: 'J', // Too short (min should be 2, based on common rules)
  email: 'invalid-email', // Invalid format
  age: -5 // Below minimum
};

// ==========================================================================
// Dynamic Form Functions
// ==========================================================================

// Form generation function by user type
const createUserFormByType = ({ newSchema, oldForm }) => {
  const baseForm = {
    name: oldForm.name || 'Default User',
    email: oldForm.email || 'default@example.com'
  };

  // Add different fields based on schema
  if (newSchema && newSchema._schema && newSchema._schema.role) {
    return {
      ...baseForm,
      role: oldForm.role || 'user',
      permissions: oldForm.permissions || []
    };
  }

  if (newSchema && newSchema._schema && newSchema._schema.age) {
    return {
      ...baseForm,
      age: oldForm.age || 25
    };
  }

  return baseForm;
};

// Form generation function by version
const createFormByVersion = ({ newSchema, oldForm }) => {
  const baseForm = {
    title: oldForm.title || 'Default Title'
  };

  // Add different fields based on schema
  if (newSchema && newSchema._schema && newSchema._schema.description) {
    baseForm.description = oldForm.description || 'Default Description';
  }

  if (newSchema && newSchema._schema && newSchema._schema.tags) {
    baseForm.tags = oldForm.tags || [];
  }

  return baseForm;
};

// Conditional form generation function
const createConditionalForm = ({ newSchema, oldForm }) => {
  const form = {
    title: oldForm.title || 'Default Title',
    content: oldForm.content || 'Default Content'
  };

  // Add conditional fields based on schema
  if (newSchema && newSchema._schema && newSchema._schema._id) {
    form._id = oldForm._id || new ObjectId().toString();
  }

  if (newSchema && newSchema._schema && newSchema._schema.publishedAt) {
    form.publishedAt = oldForm.publishedAt || new Date();
    form.published = oldForm.published || false;
  }

  if (newSchema && newSchema._schema && newSchema._schema.metadata) {
    form.metadata = {
      author: oldForm.metadata?.author || 'Unknown Author',
      category: oldForm.metadata?.category || 'General'
    };
  }

  return form;
};

// Form migration function on schema change
const migrateFormOnSchemaChange = ({ newSchema, oldForm }) => {
  // Convert existing form data to fit new schema
  const migratedForm = {};

  if (oldForm.name) migratedForm.name = oldForm.name;
  if (oldForm.email) migratedForm.email = oldForm.email;
  if (oldForm.title) migratedForm.title = oldForm.title;
  if (oldForm.content) migratedForm.content = oldForm.content;

  // Set default values matching new schema
  if (newSchema && newSchema._schema) {
    if (newSchema._schema.age && !migratedForm.age) {
      migratedForm.age = 25;
    }
    if (newSchema._schema.published && migratedForm.published === undefined) {
      migratedForm.published = false;
    }
  }

  return migratedForm;
};

// Invalid form function (for error testing)
const createInvalidFormFunction = ({ newSchema, oldForm }) => {
  return {
    name: 'J', // Too short
    email: 'invalid', // Invalid format
    age: -10 // Below minimum
  };
};

// ==========================================================================
// Schema Selectors (for dynamic schema functions)
// ==========================================================================

const userTypeSelectors = {
  admin: { userType: 'admin' },
  user: { userType: 'user' },
  guest: { userType: 'guest' }
};

const versionSelectors = {
  v1: { version: 'v1' },
  v2: { version: 'v2' },
  v3: { version: 'v3' }
};

const conditionalSelectors = {
  withId: { hasId: true, isPublished: false, includeMetadata: false },
  published: { hasId: true, isPublished: true, includeMetadata: false },
  withMetadata: { hasId: true, isPublished: true, includeMetadata: true }
};

module.exports = {
  // Static forms
  userForm,
  adminUserForm,
  postForm,
  nestedForm,
  emptyForm,
  partialForm,
  invalidForm,

  // Dynamic form functions
  createUserFormByType,
  createFormByVersion,
  createConditionalForm,
  migrateFormOnSchemaChange,
  createInvalidFormFunction,

  // Schema selectors
  userTypeSelectors,
  versionSelectors,
  conditionalSelectors
};
