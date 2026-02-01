/**
 * [Test Design Warning]
 *
 * This integration test actually performs schema validation per gate.
 * Therefore, if schema validation fails, the case is immediately handled as validationError,
 * and subsequent expected logic (e.g., verifying res.gate.success call) does not proceed.
 *
 * When designing tests, explicitly determine:
 * 1) Pass schema and verify post-pass behavior
 * 2) Intentionally fail schema and expect validationError
 *
 * Recommended patterns
 * - Purpose: Pass schema: Construct body (or form under formPath) according to schema
 * - Purpose: Verify failure: Explicitly set expectation to validationError
 * - Verify behavior without schema: Remove schema for the gate (e.g., GET /users)
 * - When using paramsToForm: Pre-check if mapping target key exists in schema and type matches
 * - Root path: Maintain consistency by including trailing slash like '/users/' per gateDefsFromRaw rules
 */
/**
 * Gating middleware integration test
 * 
 * Verify actual Express middleware behavior
 */
const { initializeTerminalDef, gating } = require('../gating');
const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw } = require('@godbliss/core/utils');
const { userSchema, userWithIdSchema, createDynamicSchema, complexSchema } = require('../__mocks__/mock-schema');
const { simpleUserForm, userWithIdForm, formWithPath } = require('../__mocks__/mock-form');
const { createMockRequest, createMockResponse, createMockNext, mockRequests } = require('../__mocks__/mock-request');

describe('Gating middleware integration', () => {
  beforeEach(() => {
    // Initialize gating with test configuration (3-level structure: firstPath -> lastPath -> method)
    initializeTerminalDef({
      gateDefs: gateDefsFromRaw({
        '/users': {
          '/': {
            POST: {
              schema: userSchema,
              formPath: 'user',
              errorSpec: {
                'request.bad': {}
              }
            },
            GET: { description: 'no schema' }
          },
          '/:userId': {
            GET: {
              schema: userWithIdSchema,
              paramsToForm: { 'userId': '_id' }
            }
          }
        }
      }),
      errorDefs: errorDefsFromRaw({}),
      successDefs: successDefsFromRaw({})
    });
  });

  describe('Request processing', () => {
    test('should process valid POST request with formPath correctly', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
            age: 30
          }
        }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(req.gate).toBeDefined();
      expect(req.gate.gateDef).toBeDefined();
      expect(req.gate.schema).toBe(userSchema);
      expect(req.gate.gateDef.formPath).toBe('user');
      expect(req.gate.form).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
      });
      expect(res.gate).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('should process valid GET request without formPath correctly', () => {
      const req = createMockRequest({
        method: 'GET',
        route: { path: '/users/' },
        body: {}
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(req.gate).toBeDefined();
      expect(req.gate.gateDef).toBeDefined();
      expect(req.gate.schema).toBeUndefined();
      expect(res.gate).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle request with URL parameters and paramsToForm', () => {
      const req = createMockRequest({
        method: 'GET',
        route: { path: '/users/:userId' },
        params: { userId: '507f1f77bcf86cd799439011' },
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(req.gate).toBeDefined();
      expect(req.gate.gateDef.paramsToForm).toEqual({ 'userId': '_id' });
      expect(req.gate.form).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Error handling', () => {
    test('should call next with error for invalid form data', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: {
          user: {
            name: 'A', // Too short
            email: 'invalid-email', // Invalid format
            age: -5 // Below minimum
          }
        }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          name: 'validationError',
          code: 400
        })
      );
    });

    test('should call next with gateNotFound error for unknown route', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/unknown' },
        body: {}
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          name: 'gateNotFound',
          code: 500
        })
      );
    });

    test('should call next with gateError for invalid schema', () => {
      // Initialize with invalid schema
      initializeTerminalDef({
        gateDefs: gateDefsFromRaw({
          '/test': {
            '/': {
              POST: {
                schema: 'invalid-schema' // Not a SimpleSchema instance
              }
            }
          }
        }),
        errorDefs: errorDefsFromRaw({}),
        successDefs: successDefsFromRaw({})
      });

      const req = createMockRequest({
        method: 'POST',
        route: { path: '/test/' },
        body: { test: 'data' }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system',
          name: 'gateError',
          code: 500
        })
      );
    });
  });

  describe('Response handling', () => {
    test('should provide success response methods', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: { user: simpleUserForm }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(res.gate.success).toBeDefined();
      expect(typeof res.gate.success).toBe('function');
      expect(res.gate.error).toBeDefined();
      expect(typeof res.gate.error).toBe('function');
      expect(res.gate.getError).toBeDefined();
      expect(typeof res.gate.getError).toBe('function');
    });

    test('should handle success response correctly', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: { user: simpleUserForm }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      // Test success response
      res.gate.success('response.ok', { id: 1, name: 'John' });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'response',
          name: 'ok',
          code: 200,
          data: { id: 1, name: 'John' }
        })
      );
    });

    test('should handle error response correctly', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: { user: simpleUserForm }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      // Test error response
      res.gate.error('request.bad');

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          name: 'bad',
          code: 400
        })
      );
    });
  });

  describe('Dynamic schema handling', () => {
    test('should handle function-based schemas', () => {
      initializeTerminalDef({
        gateDefs: gateDefsFromRaw({
          '/dynamic': {
            '/': {
              POST: {
                schema: (form) => createDynamicSchema(form)
              }
            }
          }
        }),
        errorDefs: errorDefsFromRaw({}),
        successDefs: successDefsFromRaw({})
      });

      const req = createMockRequest({
        method: 'POST',
        route: { path: '/dynamic/' },
        body: {
          name: 'Dynamic User',
          type: 'user',
          isAdmin: true
        }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(req.gate).toBeDefined();
      expect(req.gate.schema).toBeDefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Lazy schemas handling', () => {
    test('should handle lazySchemas correctly', () => {
      initializeTerminalDef({
        gateDefs: gateDefsFromRaw({
          '/lazy': {
            '/': {
              POST: {
                schema: userSchema,
                lazySchemas: { userSchema, userWithIdSchema }
              }
            }
          }
        }),
        errorDefs: errorDefsFromRaw({}),
        successDefs: successDefsFromRaw({})
      });

      const req = createMockRequest({
        method: 'POST',
        route: { path: '/lazy/' },
        body: simpleUserForm,
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(req.gate.lazySchemas).toEqual({ userSchema, userWithIdSchema });
      expect(next).toHaveBeenCalledWith();
    });

    test('should handle function-based lazySchemas', () => {
      initializeTerminalDef({
        gateDefs: gateDefsFromRaw({
          '/lazy-func': {
            '/': {
              POST: {
                schema: userSchema,
                lazySchemas: (form) => ({ userSchema })
              }
            }
          }
        }),
        errorDefs: errorDefsFromRaw({}),
        successDefs: successDefsFromRaw({})
      });

      const req = createMockRequest({
        method: 'POST',
        route: { path: '/lazy-func/' },
        body: simpleUserForm
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(req.gate.lazySchemas).toEqual({ userSchema });
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Edge cases', () => {
    test('should return validationError for empty body with required schema', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: {}
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          name: 'validationError',
          code: 400
        })
      );
    });

    test('should return validationError when formPath is set but form is invalid', () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/' },
        body: {
          user: {
            name: 'A',             // invalid (too short)
            email: 'invalid-email',// invalid format
            age: -5                // invalid (below min)
          }
        }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          name: 'validationError',
          code: 400
        })
      );
    });

    test('should return validationError when paramsToForm injects type-mismatched field on nested path', () => {
      initializeTerminalDef({
        gateDefs: gateDefsFromRaw({
          '/users': {
            '/:userId/posts/:postId': {
              POST: {
                schema: userSchema,
                paramsToForm: { 'userId': 'age' }
              }
            }
          }
        }),
        errorDefs: errorDefsFromRaw({}),
        successDefs: successDefsFromRaw({})
      });

      const req = createMockRequest({
        method: 'POST',
        route: { path: '/users/:userId/posts/:postId' },
        params: { userId: '123', postId: '456' },
        body: {
          name: 'John',
          email: 'john@example.com'
        }
      });

      const res = createMockResponse();
      const next = createMockNext();

      gating(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'request',
          name: 'validationError',
          code: 400
        })
      );
    });
  });
});
