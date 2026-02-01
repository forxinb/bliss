const { errorDefsFromRaw, successDefsFromRaw } = require('../defs-from-raw');

describe('errorDefsFromRaw/successDefsFromRaw', () => {
  test('errorDefsFromRaw converts raw error definitions to processed definitions', () => {
    const errorDefs = {
      request: {
        bad: { code: 400 },
        validationError: ({ error }) => ({ code: 400, error })
      },
      system: { gateNotFound: { code: 500 } }
    };

    const errors = errorDefsFromRaw(errorDefs);

    expect(errors.request.bad).toEqual({ type: 'request', name: 'bad', code: 400 });
    expect(typeof errors.request.validationError).toBe('function');
    const dyn = errors.request.validationError({ error: 'x' });
    expect(dyn).toEqual({ type: 'request', name: 'validationError', code: 400, error: 'x' });
    expect(errors.system.gateNotFound).toEqual({ type: 'system', name: 'gateNotFound', code: 500 });
  });

  test('successDefsFromRaw converts raw success definitions to processed definitions', () => {
    const successDefs = {
      response: { ok: { code: 200 } },
      post: { create: { code: 201 }, update: { code: 200 } }
    };

    const success = successDefsFromRaw(successDefs);

    expect(success.response.ok).toEqual({ type: 'response', name: 'ok', code: 200 });
    expect(success.post.create).toEqual({ type: 'post', name: 'create', code: 201 });
    expect(success.post.update).toEqual({ type: 'post', name: 'update', code: 200 });
  });
});
