// @godbliss/express execute tests

const { execute } = require('../execute.js');

describe('execute', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('when handler is not a function', () => {
    test('should pass error to next when string is passed', () => {
      const middleware = execute('not a function');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toBe('execute: handler must be a function');
    });

    test('should pass error to next when null is passed', () => {
      const middleware = execute(null);

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('when handler is a synchronous function', () => {
    test('should not call next when execution succeeds', () => {
      const syncHandler = jest.fn((req, res, next) => {
        res.status = 200;
      });

      const middleware = execute(syncHandler);

      middleware(mockReq, mockRes, mockNext);

      expect(syncHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass error to next when error occurs', () => {
      const error = new Error('Sync error');
      const syncHandler = jest.fn((req, res, next) => {
        throw error;
      });

      const middleware = execute(syncHandler);

      middleware(mockReq, mockRes, mockNext);

      expect(syncHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('when handler is an asynchronous function', () => {
    test('should not call next when execution succeeds', async () => {
      const asyncHandler = jest.fn(async (req, res, next) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        res.status = 200;
      });

      const middleware = execute(asyncHandler);

      await middleware(mockReq, mockRes, mockNext);

      expect(asyncHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass error to next when error occurs', async () => {
      const error = new Error('Async error');
      const asyncHandler = jest.fn(async (req, res, next) => {
        throw error;
      });

      const middleware = execute(asyncHandler);

      await middleware(mockReq, mockRes, mockNext);

      expect(asyncHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('when handler returns a Promise', () => {
    test('should handle resolved Promise correctly', async () => {
      const promiseHandler = jest.fn((req, res, next) => {
        return Promise.resolve('success');
      });

      const middleware = execute(promiseHandler);

      await middleware(mockReq, mockRes, mockNext);

      expect(promiseHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should pass error to next when Promise rejects', async () => {
      const error = new Error('Promise error');
      const promiseHandler = jest.fn((req, res, next) => {
        return Promise.reject(error);
      });

      const middleware = execute(promiseHandler);

      await middleware(mockReq, mockRes, mockNext);

      expect(promiseHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
