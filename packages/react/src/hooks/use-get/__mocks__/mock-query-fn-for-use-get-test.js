// Mock createQueryFn for testing use-get hook
const mockCreateQueryFn = jest.fn(({ gate, customQueryClient }) => {
  return jest.fn(() => {
    return Promise.resolve({
      data: { message: `Mock data for ${gate.urlSuffix}` },
      status: 200
    });
  });
});

module.exports = mockCreateQueryFn;
