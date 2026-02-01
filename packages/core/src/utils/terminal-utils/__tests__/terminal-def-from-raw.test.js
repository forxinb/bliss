const { gateDefsFromRaw, errorDefsFromRaw, successDefsFromRaw } = require('../defs-from-raw');

describe('terminalDef composition', () => {
  test('creates terminalDef from individual defsFromRaw functions', () => {
    const defs = {
      gateDefs: {
        '/posts': {
          '/': { GET: { contentType: 'json' } }
        }
      },
      errorDefs: { request: { bad: { code: 400 } } },
      successDefs: { response: { ok: { code: 200 } } }
    };

    const terminalDef = {
      gateDefs: gateDefsFromRaw(defs.gateDefs),
      errorDefs: errorDefsFromRaw(defs.errorDefs),
      successDefs: successDefsFromRaw(defs.successDefs)
    };

    expect(terminalDef).toHaveProperty('gateDefs');
    expect(terminalDef).toHaveProperty('errorDefs');
    expect(terminalDef).toHaveProperty('successDefs');

    expect(terminalDef.gateDefs['/posts/'].GET.contentType).toBe('json');
    expect(terminalDef.errorDefs.request.bad).toEqual({ type: 'request', name: 'bad', code: 400 });
    expect(terminalDef.successDefs.response.ok).toEqual({ type: 'response', name: 'ok', code: 200 });
  });
});
