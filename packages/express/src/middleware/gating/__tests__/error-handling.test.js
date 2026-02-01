/**
 * Error handling system tests
 * 
 * Verify static error vs dynamic error handling
 */
const { errorDefsFromRaw, successDefsFromRaw } = require('@godbliss/core/utils');

describe('Error and Success handling', () => {
  describe('errorDefsFromRaw - Static errors', () => {
    test('should build static system errors correctly', () => {
      const errorDefs = {
        system: {
          gateError: { code: 500 },
          gateNotFound: { code: 500 },
          unknown: { code: 500 }
        }
      };

      const result = errorDefsFromRaw(errorDefs);

      expect(result.system.gateError).toEqual({
        type: 'system',
        name: 'gateError',
        code: 500
      });

      expect(result.system.gateNotFound).toEqual({
        type: 'system',
        name: 'gateNotFound',
        code: 500
      });
    });

    test('should build static request errors correctly', () => {
      const errorDefs = {
        request: {
          bad: { code: 400 },
          notFound: { code: 404 },
          conflict: { code: 409 }
        }
      };

      const result = errorDefsFromRaw(errorDefs);

      expect(result.request.bad).toEqual({
        type: 'request',
        name: 'bad',
        code: 400
      });

      expect(result.request.notFound).toEqual({
        type: 'request',
        name: 'notFound',
        code: 404
      });
    });
  });

  describe('errorDefsFromRaw - Dynamic errors', () => {
    test('should build dynamic validation errors correctly', () => {
      const errorDefs = {
        request: {
          validationError: ({ error }) => ({
            code: 400,
            error: error
          })
        }
      };

      const result = errorDefsFromRaw(errorDefs);
      const validationError = result.request.validationError({
        error: 'Invalid email format'
      });

      expect(validationError).toEqual({
        type: 'request',
        name: 'validationError',
        code: 400,
        error: 'Invalid email format'
      });
    });

    test('should handle dynamic errors with complex data', () => {
      const errorDefs = {
        request: {
          customError: ({ message, details, code = 400 }) => ({
            code: code,
            message: message,
            details: details
          })
        }
      };

      const result = errorDefsFromRaw(errorDefs);
      const customError = result.request.customError({
        message: 'Custom error occurred',
        details: { field: 'email', value: 'invalid' },
        code: 422
      });

      expect(customError).toEqual({
        type: 'request',
        name: 'customError',
        code: 422,
        message: 'Custom error occurred',
        details: { field: 'email', value: 'invalid' }
      });
    });

    test('should handle dynamic errors with default parameters', () => {
      const errorDefs = {
        request: {
          errorWithDefaults: ({ message, code = 400 }) => ({
            code: code,
            message: message
          })
        }
      };

      const result = errorDefsFromRaw(errorDefs);
      const error = result.request.errorWithDefaults({
        message: 'Error with default code'
      });

      expect(error).toEqual({
        type: 'request',
        name: 'errorWithDefaults',
        code: 400,
        message: 'Error with default code'
      });
    });
  });

  describe('errorDefsFromRaw - Mixed static and dynamic', () => {
    test('should handle both static and dynamic errors in same definition', () => {
      const errorDefs = {
        system: {
          gateError: { code: 500 }
        },
        request: {
          bad: { code: 400 },
          validationError: ({ error }) => ({
            code: 400,
            error: error
          })
        }
      };

      const result = errorDefsFromRaw(errorDefs);

      // Static errors
      expect(result.system.gateError).toEqual({
        type: 'system',
        name: 'gateError',
        code: 500
      });

      expect(result.request.bad).toEqual({
        type: 'request',
        name: 'bad',
        code: 400
      });

      // Dynamic errors
      const validationError = result.request.validationError({
        error: 'Test error'
      });
      expect(validationError).toEqual({
        type: 'request',
        name: 'validationError',
        code: 400,
        error: 'Test error'
      });
    });
  });

  describe('successDefsFromRaw', () => {
    test('should build static success responses correctly', () => {
      const successDefs = {
        response: {
          ok: { code: 200 },
        },
        create: {
          doc: { code: 201 },
          docs: { code: 201 }
        },
        update: {
          doc: { code: 200 },
          docs: { code: 200 }
        }
      };

      const result = successDefsFromRaw(successDefs);

      expect(result.response.ok).toEqual({
        type: 'response',
        name: 'ok',
        code: 200
      });

      expect(result.create.doc).toEqual({
        type: 'create',
        name: 'doc',
        code: 201
      });

      expect(result.update.docs).toEqual({
        type: 'update',
        name: 'docs',
        code: 200
      });
    });

    test('should handle nested success definitions', () => {
      const successDefs = {
        request: {
          ok: { code: 200 }
        },
        create: {
          doc: { code: 201 }
        }
      };

      const result = successDefsFromRaw(successDefs);

      expect(result.request.ok).toEqual({
        type: 'request',
        name: 'ok',
        code: 200
      });

      expect(result.create.doc).toEqual({
        type: 'create',
        name: 'doc',
        code: 201
      });
    });
  });

  describe('Error handling edge cases', () => {
    test('should handle empty error definitions', () => {
      const result = errorDefsFromRaw({});
      expect(result).toEqual({});
    });

    test('should handle error definitions with no properties', () => {
      const errorDefs = {
        system: {},
        request: {}
      };

      expect(() => errorDefsFromRaw(errorDefs)).toThrow();
    });

    test('should handle function-based error definitions', () => {
      const errorDefs = {
        request: {
          dynamicError: (custom = {}) => ({
            code: 400,
            ...custom
          })
        }
      };

      const result = errorDefsFromRaw(errorDefs);
      const error = result.request.dynamicError({ message: 'Custom message' });

      expect(error).toEqual({
        type: 'request',
        name: 'dynamicError',
        code: 400,
        message: 'Custom message'
      });
    });
  });

  describe('Success handling edge cases', () => {
    test('should handle empty success definitions', () => {
      const result = successDefsFromRaw({});
      expect(result).toEqual({});
    });

    test('should handle function-based success definitions', () => {
      const successDefs = {
        test: {
          custom: (data = {}) => ({
            code: 200,
            ...data
          })
        }
      };

      const result = successDefsFromRaw(successDefs);
      const success = result.test.custom({ message: 'Success' });

      expect(success).toEqual({
        type: 'test',
        name: 'custom',
        code: 200,
        message: 'Success'
      });
    });
  });
});
