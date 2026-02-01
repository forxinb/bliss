/**
 * gateDefsFromRaw function tests
 * 
 * 🚨 IMPORTANT: " Verify correct operation with test code" part specified in TODO
 */
const _ = require('lodash');
const { gateDefsFromRaw } = require('@godbliss/core/utils');
const { userSchema, userWithIdSchema, nestedUserSchema, complexSchema } = require('../__mocks__/mock-schema');

describe('gateDefsFromRaw', () => {
  describe('Basic functionality', () => {
    test('should build gates from gateDefs correctly', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: {
              schema: userSchema,
              formPath: 'user',
              paramsToForm: { 'userId': '_id' }
            },
            GET: {
              schema: userSchema
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/users.POST')).toBeDefined();
      expect(_.get(result, '/api/users.GET')).toBeDefined();

      expect(_.get(result, '/api/users.POST')).toEqual({
        schema: userSchema,
        formPath: 'user',
        paramsToForm: { 'userId': '_id' },
        path: '/api/users',
        method: 'POST'
      });

      expect(_.get(result, '/api/users.GET')).toEqual({
        schema: userSchema,
        path: '/api/users',
        method: 'GET'
      });
    });

    test('should handle empty gateDefs', () => {
      const result = gateDefsFromRaw({});
      expect(result).toEqual({});
    });

    test('should throw for gateDefs with no methods', () => {
      const gateDefs = {
        '/api': {
          '/users': {}
        }
      };

      expect(() => gateDefsFromRaw(gateDefs)).toThrow();
    });
  });

  describe('Path combination', () => {
    test('should correctly combine baseUrl and path', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: {
              schema: userSchema
            }
          },
          '/posts': {
            GET: {
              schema: userSchema
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/users.POST')).toBeDefined();
      expect(_.get(result, '/api/posts.GET')).toBeDefined();

      expect(_.get(result, '/api/users.POST').path).toBe('/api/users');
      expect(_.get(result, '/api/posts.GET').path).toBe('/api/posts');
    });

    test('should handle nested paths correctly', () => {
      const gateDefs = {
        '/api/v1': {
          '/users/:userId': {
            GET: {
              schema: userWithIdSchema
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/v1/users/:userId.GET')).toBeDefined();
      expect(_.get(result, '/api/v1/users/:userId.GET').path).toBe('/api/v1/users/:userId');
    });
  });

  describe('Method handling', () => {
    test('should handle all HTTP methods', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            GET: { schema: userSchema },
            POST: { schema: userSchema },
            PUT: { schema: userSchema },
            DELETE: { schema: userSchema },
            PATCH: { schema: userSchema }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/users.GET')).toBeDefined();
      expect(_.get(result, '/api/users.POST')).toBeDefined();
      expect(_.get(result, '/api/users.PUT')).toBeDefined();
      expect(_.get(result, '/api/users.DELETE')).toBeDefined();
      expect(_.get(result, '/api/users.PATCH')).toBeDefined();
    });

    test('should preserve method names correctly', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: {
              schema: userSchema,
              contentType: 'json'
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/users.POST').method).toBe('POST');
    });
  });

  describe('Gate properties preservation', () => {
    test('should preserve all gate properties', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: {
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
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);
      const gateData = _.get(result, '/api/users.POST');

      expect(gateData.schema).toBe(userSchema);
      expect(gateData.formPath).toBe('user');
      expect(gateData.paramsToForm).toEqual({ 'userId': '_id' });
      expect(gateData.contentType).toBe('json');
      expect(gateData.lazySchemas).toEqual([userSchema]);
      expect(gateData.errorSpec).toEqual({
        validationError: { code: 400 }
      });
      expect(gateData.successSpec).toEqual({
        created: { code: 201 }
      });
    });

    test('should add path and method metadata', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: {
              schema: userSchema
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);
      const gateData = _.get(result, '/api/users.POST');

      expect(gateData.path).toBe('/api/users');
      expect(gateData.method).toBe('POST');
    });
  });

  describe('Complex scenarios', () => {
    test('should handle multiple baseUrls and paths', () => {
      const gateDefs = {
        '/api/v1': {
          '/users': {
            POST: { schema: userSchema },
            GET: { schema: userSchema }
          },
          '/posts': {
            POST: { schema: userSchema }
          }
        },
        '/api/v2': {
          '/users': {
            POST: { schema: userSchema }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(Object.keys(result)).toHaveLength(3);
      expect(_.get(result, '/api/v1/users.POST')).toBeDefined();
      expect(_.get(result, '/api/v1/users.GET')).toBeDefined();
      expect(_.get(result, '/api/v1/posts.POST')).toBeDefined();
      expect(_.get(result, '/api/v2/users.POST')).toBeDefined();
    });

    test('should handle nested schemas', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: {
              schema: nestedUserSchema
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/users.POST').schema).toBe(nestedUserSchema);
    });

    test('should handle complex schemas with metadata', () => {
      const gateDefs = {
        '/api': {
          '/articles': {
            POST: {
              schema: complexSchema
            }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/articles.POST').schema).toBe(complexSchema);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty baseUrl', () => {
      const gateDefs = {
        '': {
          '/users': {
            POST: { schema: userSchema }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/users.POST')).toBeDefined();
      expect(_.get(result, '/users.POST').path).toBe('/users');
    });

    test('should handle empty path', () => {
      const gateDefs = {
        '/api': {
          '': {
            POST: { schema: userSchema }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api.POST')).toBeDefined();
      expect(_.get(result, '/api.POST').path).toBe('/api');
    });

    test('should handle special characters in paths', () => {
      const gateDefs = {
        '/api': {
          '/users/:userId/posts/:postId': {
            GET: { schema: userSchema }
          }
        }
      };

      const result = gateDefsFromRaw(gateDefs);

      expect(_.get(result, '/api/users/:userId/posts/:postId.GET')).toBeDefined();
      expect(_.get(result, '/api/users/:userId/posts/:postId.GET').path).toBe('/api/users/:userId/posts/:postId');
    });

    test('should throw when firstPath def is invalid structure', () => {
      const gateDefs = {
        '/api': null
      };

      expect(() => gateDefsFromRaw(gateDefs)).toThrow();
    });

    test('should throw when lastPath elem is invalid structure', () => {
      const gateDefs = {
        '/api': {
          '/users': null
        }
      };

      expect(() => gateDefsFromRaw(gateDefs)).toThrow();
    });

    test('should throw when gateData is invalid structure', () => {
      const gateDefs = {
        '/api': {
          '/users': {
            POST: null
          }
        }
      };

      expect(() => gateDefsFromRaw(gateDefs)).toThrow();
    });
  });
});
