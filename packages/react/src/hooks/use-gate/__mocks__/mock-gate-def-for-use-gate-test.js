/**
 * Mock GateDef for useGate Hook testing
 * 
 * Matches structure produced by gateDefsFromRaw in gating middleware
 */
const { userSchema, userWithIdSchema, postSchema, getDynamicSchema } = require('./mock-schema-for-use-gate-test');

// Minimal gateDef structure (method and path only)
const minimalGateDef = {
  method: 'GET',
  path: '/api/users'
};

// Complete gateDef structure (all properties included)
const completeGateDef = {
  method: 'POST',
  path: '/api/users',
  schema: userSchema,
  formPath: 'user',
  paramsToForm: { 'userId': '_id' },
  contentType: 'json',
  lazySchemas: [userSchema],
  errorSpec: {
    validationError: { code: 400 }
  },
  successSpec: {
    created: { code: 201 }
  }
};

// Nested path gateDef
const nestedPathGateDef = {
  method: 'GET',
  path: '/users/:userId/feeds',
  schema: userWithIdSchema,
  paramsToForm: { 'userId': '_id' }
};

// Multiple parameter gateDef
const multiParamGateDef = {
  method: 'GET',
  path: '/users/:userId/posts/:postId',
  schema: postSchema,
  paramsToForm: { 'userId': '_id', 'postId': '_id' }
};

// Functional gateDef (dynamic schema)
const functionGateDef = (schemaSelector) => ({
  method: 'GET',
  path: '/api/users/:userId',
  schema: getDynamicSchema(schemaSelector),
  paramsToForm: { 'userId': '_id' }
});

// gateDefs for three-level structure simulation
const threeLevelGateDefs = {
  '/users': {                    // firstPath
    '/': {                       // lastPath
      POST: completeGateDef,    // method: gateDef
      GET: minimalGateDef
    },
    '/:userId': {                // lastPath
      GET: nestedPathGateDef,   // method: gateDef
      PUT: completeGateDef
    },
    '/:userId/posts': {          // lastPath
      GET: multiParamGateDef,   // method: gateDef
      POST: completeGateDef
    }
  }
};

// gateDef grouped by HTTP methods
const httpMethodGateDef = {
  GET: {
    method: 'GET',
    path: '/api/users',
    schema: userSchema
  },
  POST: {
    method: 'POST',
    path: '/api/users',
    schema: userSchema,
    formPath: 'user'
  },
  PUT: {
    method: 'PUT',
    path: '/api/users/:userId',
    schema: userWithIdSchema,
    paramsToForm: { 'userId': '_id' }
  },
  DELETE: {
    method: 'DELETE',
    path: '/api/users/:userId',
    schema: userWithIdSchema,
    paramsToForm: { 'userId': '_id' }
  },
  PATCH: {
    method: 'PATCH',
    path: '/api/users/:userId',
    schema: userWithIdSchema,
    paramsToForm: { 'userId': '_id' }
  }
};

// gateDef for error testing
const invalidGateDef = {
  // method missing - should cause error
  path: '/api/users'
};

const unsupportedMethodGateDef = {
  method: 'HEAD',  // not in SUPPORTED_HTTP_METHODS
  path: '/api/users'
};

module.exports = {
  minimalGateDef,
  completeGateDef,
  nestedPathGateDef,
  multiParamGateDef,
  functionGateDef,
  threeLevelGateDefs,
  httpMethodGateDef,
  invalidGateDef,
  unsupportedMethodGateDef
};
