const { makeSchema } = require('@godbliss/core/utils');

// Schema for testing
const userSchema = makeSchema({
  name: { type: String, required: true },
  email: { type: String, required: true, regEx: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  age: { type: Number, min: 0, max: 150, optional: true }
});

const defaultSchema = makeSchema({
  type: { type: String, required: true }
});

// Generic Action Definitions for useGenericAction
const genericActionDefs = {
  // Successful user creation action
  createUser: {
    execute: jest.fn((params) => {
      return Promise.resolve({
        success: true,
        user: {
          name: params.form.name,
          email: params.form.email,
          age: params.form.age
        },
        priority: params.priority
      });
    }),
    schema: userSchema,
    alertSuccess: {
      title: 'Creation Complete',
      message: 'User has been created.'
    },
    goOnSuccess: 'back',
    invalidateQueriesOnSuccess: {
      queryKey: ['users']
    }
  },

  // User creation action that throws error
  createUserWithError: {
    execute: jest.fn((params) => {
      return Promise.reject(new Error('Creation failed'));
    }),
    schema: userSchema,
    alertError: {
      title: 'Creation Failed',
      message: 'Failed to create user.'
    },
    alertValidationError: {
      title: 'Validation Failed',
      message: 'Please check the input information.'
    }
  },

  // User creation action with check logic
  createUserWithCheck: {
    execute: jest.fn((params) => {
      return Promise.resolve({
        success: true,
        user: {
          name: params.form.name,
          email: params.form.email,
          age: params.form.age
        },
        priority: params.priority
      });
    }),
    schema: userSchema,
    check: jest.fn((params) => {
      if (!params.form.email) {
        throw new Error('Email is required');
      }
      return Promise.resolve();
    }),
    alertSuccess: {
      title: 'Creation Complete',
      message: 'User has been created.'
    },
    goOnSuccess: 'back',
    invalidateQueriesOnSuccess: {
      queryKey: ['users']
    },
    alertValidationError: {
      title: 'Validation Failed',
      message: 'Please check the input information.'
    }
  },

  // Action without schema
  simpleAction: {
    execute: jest.fn((params) => {
      return Promise.resolve({
        success: true,
        data: params.customData
      });
    })
  },

  // Action using dynamic schema
  dynamicSchemaAction: {
    execute: jest.fn((params) => {
      return Promise.resolve({
        success: true,
        schemaType: params.schemaType
      });
    }),
    schema: (schemaSelector) => {
      if (schemaSelector.schemaType === 'user') {
        return userSchema;
      }
      return defaultSchema;
    }
  },

  // Action that requires confirmation
  createUserWithConfirm: {
    execute: jest.fn((params) => {
      return Promise.resolve({
        success: true,
        user: {
          name: params.form.name,
          email: params.form.email,
          age: params.form.age
        },
        priority: params.priority
      });
    }),
    schema: userSchema,
    confirmAction: {
      title: 'Confirmation Required',
      message: 'Do you want to create this user?'
    },
    alertSuccess: {
      title: 'Creation Complete',
      message: 'User has been created after confirmation.'
    },
    goOnSuccess: 'back',
    invalidateQueriesOnSuccess: {
      queryKey: ['users']
    }
  }
};

module.exports = {
  genericActionDefs,
  userSchema,
  defaultSchema
};
