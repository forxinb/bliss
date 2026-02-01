/**
 * Terminal validation tests
 * 
 * initializeTerminal validationError override verification test
 */
const { initializeTerminalDef } = require('../gating');

describe('Terminal validation', () => {
  describe('validationError override validation', () => {
    test('should pass when validationError is overridden with function', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: ({ error }) => ({ code: 400, error, custom: true })
            }
          }
        });
      }).not.toThrow();
    });

    test('should pass when validationError is overridden with complex function', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: ({ error, details, field }) => ({
                code: 400,
                error,
                details,
                field,
                timestamp: new Date().toISOString()
              })
            }
          }
        });
      }).not.toThrow();
    });

    test('should throw error when validationError is overridden with object', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: { code: 400, message: "Custom validation error" }
            }
          }
        });
      }).toThrow('validationError must be a function');
    });

    test('should throw error when validationError is overridden with null', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: null
            }
          }
        });
      }).toThrow('validationError must be a function');
    });

    test('should throw error when validationError is overridden with undefined', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: undefined
            }
          }
        });
      }).toThrow('validationError must be a function');
    });

    test('should throw error when validationError is overridden with string', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: "Custom error message"
            }
          }
        });
      }).toThrow('validationError must be a function');
    });

    test('should throw error when validationError is overridden with number', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              validationError: 400
            }
          }
        });
      }).toThrow('validationError must be a function');
    });

    test('should pass when validationError is not provided', () => {
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            request: {
              bad: { code: 400 }
            }
          }
        });
      }).not.toThrow();
    });

    test('should pass when errors is not provided', () => {
      expect(() => {
        initializeTerminalDef({
          gates: {}
        });
      }).not.toThrow();
    });

    test('should pass when projectTerminal is empty object', () => {
      expect(() => {
        initializeTerminalDef({});
      }).not.toThrow();
    });

    test('should pass when projectTerminal is not provided', () => {
      expect(() => {
        initializeTerminalDef();
      }).not.toThrow();
    });
  });

  describe('terminal merge functionality', () => {
    test('should merge defaultTerminal with projectTerminal correctly', () => {
      // This test checks if initializeTerminalDef executes without error
      // The actual terminal object is inside gating.js and cannot be accessed directly
      expect(() => {
        initializeTerminalDef({
          errorDefs: {
            auth: {
              unauthorized: { code: 401 }
            }
          },
          success: {
            auth: {
              login: { code: 200 }
            }
          },
          gates: {
            '/auth': {
              '/login': {
                'POST': { schema: 'loginSchema' }
              }
            }
          }
        });
      }).not.toThrow();
    });
  });
});
