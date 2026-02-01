// Mock terminal object for testing use-get hook using terminal-utils
const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw } = require('@godbliss/core/utils');

const mockTerminalDef = {
  gateDefs: {
    '/users': {
      '': {
        GET: {
          path: '/users',
          method: 'GET',
          schema: null,
          formPath: null,
          paramsToForm: {},
          contentType: 'json'
        }
      }
    },
    '/users': {
      '/:id': {
        GET: {
          path: '/users/:id',
          method: 'GET',
          schema: null,
          formPath: null,
          paramsToForm: {},
          contentType: 'json'
        }
      }
    },
    '/posts': {
      '': {
        GET: {
          path: '/posts',
          method: 'GET',
          schema: null,
          formPath: null,
          paramsToForm: {},
          contentType: 'json'
        }
      }
    }
  },
  errorDefs: {
    request: {
      bad: { code: 400 }
    }
  },
  successDefs: {
    response: {
      ok: { code: 200 }
    }
  }
};

const mockTerminal = {
  gateDefs: gateDefsFromRaw(mockTerminalDef.gateDefs),
  errorDefs: errorDefsFromRaw(mockTerminalDef.errorDefs),
  successDefs: successDefsFromRaw(mockTerminalDef.successDefs)
};

module.exports = mockTerminal;
