const { gateDefsFromRaw } = require('../defs-from-raw');

describe('gateDefsFromRaw', () => {
  test('converts raw gate definitions to processed definitions with nested structure', () => {
    const postSchemas = {
      create: {},
      update: {}
    };

    const gateDefs = {
      '/posts': {
        '/': {
          GET: {
            contentType: 'json'
          },
          POST: {
            schema: postSchemas.create,
            formPath: 'post',
            contentType: 'json'
          }
        },
        '/:postId': {
          PUT: {
            schema: postSchemas.update,
            formPath: 'post',
            paramsToForm: { postId: '_id' },
            contentType: 'json'
          }
        }
      }
    };

    const gates = gateDefsFromRaw(gateDefs);

    // Keys generated (nested by path then method)
    expect(gates).toHaveProperty('/posts/');
    expect(gates['/posts/']).toHaveProperty('GET');
    expect(gates['/posts/']).toHaveProperty('POST');
    expect(gates).toHaveProperty('/posts/:postId');
    expect(gates['/posts/:postId']).toHaveProperty('PUT');

    // Field preservation
    expect(gates['/posts/'].GET.contentType).toBe('json');

    expect(gates['/posts/'].POST.schema).toBe(postSchemas.create);
    expect(gates['/posts/'].POST.formPath).toBe('post');
    expect(gates['/posts/'].POST.contentType).toBe('json');

    expect(gates['/posts/:postId'].PUT.schema).toBe(postSchemas.update);
    expect(gates['/posts/:postId'].PUT.formPath).toBe('post');
    expect(gates['/posts/:postId'].PUT.paramsToForm).toEqual({ postId: '_id' });
    expect(gates['/posts/:postId'].PUT.contentType).toBe('json');

    // Auto-added
    expect(gates['/posts/:postId'].PUT.path).toBe('/posts/:postId');
    expect(gates['/posts/'].POST.path).toBe('/posts/');
    expect(gates['/posts/'].POST.method).toBe('POST');
  });
});
