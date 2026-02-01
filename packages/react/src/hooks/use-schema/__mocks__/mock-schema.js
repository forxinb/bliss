/**
 * Real Schema for testing useSchemaValidations using @godbliss/core
 */
const { makeSchema, SchemaFields } = require('@godbliss/core/utils');

// Pre-defined test schemas using real @godbliss/core makeSchema
const userSchema = makeSchema({
  name: { 
    type: String, 
    min: 2,  // simpl-schema uses min for string length
    max: 50 
  },
  email: { 
    type: String,
    regEx: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/  // Simple email regex
  },
  age: { 
    type: Number, 
    min: 0, 
    max: 150,
    optional: true 
  }
}, {
  requiredByDefault: true  // name, email are required by default
});

const simpleSchema = makeSchema({
  title: { 
    type: String,
    max: 100
  }
}, {
  requiredByDefault: true
});

const nestedSchema = makeSchema({
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
      }
    })
  })
}, {
  requiredByDefault: true
});

// Schema with various field types and metadata for useSchemaInputs testing
const complexSchema = makeSchema({
  title: { 
    type: String,
    max: 100,
    label: 'Title',
    help: 'Enter the title',
    remark: 'Required field'
  },
  description: { 
    type: String,
    max: 500,
    optional: true,
    label: 'Description',
    help: 'Enter a description'
  },
  count: { 
    type: Number,
    min: 0,
    max: 1000,
    label: 'Count',
    help: 'Enter a number between 0 and 1000'
  },
  isActive: { 
    type: Boolean,
    label: 'Active Status',
    help: 'Check if this item is active'
  },
  tags: { 
    type: Array,
    optional: true,
    label: 'Tags',
    help: 'Enter tags'
  },
  'tags.$': { 
    type: String,
    max: 20
  },
  metadata: { 
    type: Object,
    optional: true,
    label: 'Metadata',
    help: 'Additional metadata'
  },
  'metadata.createdAt': { 
    type: Date,
    optional: true
  },
  'metadata.updatedAt': { 
    type: Date,
    optional: true
  }
}, {
  requiredByDefault: true
});

// Schema with readOnly fields for testing
const readOnlySchema = makeSchema({
  id: { 
    type: String,
    readOnly: true,
    label: 'ID'
  },
  name: { 
    type: String,
    max: 50,
    label: 'Name'
  },
  createdAt: { 
    type: Date,
    readOnly: true,
    label: 'Created At'
  },
  updatedAt: { 
    type: Date,
    readOnly: true,
    label: 'Updated At'
  }
}, {
  requiredByDefault: true
});

// Schema with allowed values for testing
const allowedValuesSchema = makeSchema({
  status: { 
    type: String,
    allowedValues: ['draft', 'published', 'archived'],
    label: 'Status',
    help: 'Select the status'
  },
  priority: { 
    type: Number,
    allowedValues: [1, 2, 3, 4, 5],
    label: 'Priority',
    help: 'Select priority level'
  },
  category: { 
    type: String,
    allowedValues: ['tech', 'design', 'business'],
    label: 'Category',
    help: 'Select the category'
  }
}, {
  requiredByDefault: true
});

// Schema with regex patterns for testing
const regexSchema = makeSchema({
  phone: { 
    type: String,
    regEx: /^\+?[\d\s\-\(\)]+$/,
    label: 'Phone Number',
    help: 'Enter a valid phone number'
  },
  zipCode: { 
    type: String,
    regEx: /^\d{5}(-\d{4})?$/,
    label: 'ZIP Code',
    help: 'Enter a valid ZIP code'
  },
  username: { 
    type: String,
    regEx: /^[a-zA-Z0-9_]{3,20}$/,
    label: 'Username',
    help: '3-20 characters, letters, numbers, and underscores only'
  }
}, {
  requiredByDefault: true
});

module.exports = {
  userSchema,
  simpleSchema,
  nestedSchema,
  complexSchema,
  readOnlySchema,
  allowedValuesSchema,
  regexSchema
};
