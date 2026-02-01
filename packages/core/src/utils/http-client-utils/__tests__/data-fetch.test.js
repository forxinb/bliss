const { dataFetch, handleJson, handleBson } = require('../data-fetch');

// Mock fetch globally
global.fetch = jest.fn();

describe('dataFetch', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('JSON response handling', () => {
    test('should handle successful JSON response', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({ data: 'test data' })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await dataFetch('https://api.example.com/test');

      expect(result).toEqual({
        data: { data: 'test data' },
        response: mockResponse
      });
      expect(mockResponse.json).toHaveBeenCalled();
    });

    test('should handle JSON response with success structure', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({
          type: 'success',
          name: 'test',
          data: { result: 'success' }
        })
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await dataFetch('https://api.example.com/test');

      expect(result).toEqual({
        data: { result: 'success' },
        response: mockResponse,
        success: {
          type: 'success',
          name: 'test',
          data: { result: 'success' }
        }
      });
    });

    test('should handle failed JSON response', async () => {
      const mockResponse = {
        ok: false,
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({ error: 'Not found' })
      };

      fetch.mockResolvedValue(mockResponse);

      await expect(dataFetch('https://api.example.com/test')).rejects.toEqual({
        error: { error: 'Not found' },
        response: mockResponse
      });
    });
  });

  describe('BSON response handling', () => {
    test('should handle successful BSON response', async () => {
      const { BSON } = require('bson');
      const testData = { message: 'test bson data' };
      const bsonBuffer = BSON.serialize(testData);

      const mockResponse = {
        ok: true,
        headers: {
          map: {
            'content-type': 'application/bson'
          }
        },
        arrayBuffer: jest.fn().mockResolvedValue(bsonBuffer.buffer.slice(bsonBuffer.byteOffset, bsonBuffer.byteOffset + bsonBuffer.byteLength))
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await dataFetch('https://api.example.com/test');

      expect(result).toEqual({
        data: testData,
        response: mockResponse
      });
      expect(mockResponse.arrayBuffer).toHaveBeenCalled();
    });
  });

  describe('Other content types', () => {
    test('should handle successful response with unknown content type', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          map: {
            'content-type': 'text/plain'
          }
        }
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await dataFetch('https://api.example.com/test');

      expect(result).toEqual({
        data: {},
        response: mockResponse
      });
    });

    test('should handle failed response with unknown content type', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: 'https://api.example.com/test',
        headers: {
          map: {
            'content-type': 'text/plain'
          }
        }
      };

      fetch.mockResolvedValue(mockResponse);

      await expect(dataFetch('https://api.example.com/test')).rejects.toEqual({
        error: {
          status: 404,
          statusText: 'Not Found',
          url: 'https://api.example.com/test',
          contentType: 'text/plain'
        },
        response: mockResponse
      });
    });
  });

  describe('Network errors', () => {
    test('should handle fetch network errors', async () => {
      const networkError = new Error('Network error');
      fetch.mockRejectedValue(networkError);

      await expect(dataFetch('https://api.example.com/test')).rejects.toEqual({
        error: networkError
      });
    });
  });
});

describe('handleJson', () => {
  test('should resolve with data for successful response', (done) => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ data: 'test' })
    };

    const resolve = jest.fn();
    const reject = jest.fn();

    handleJson({ response: mockResponse, resolve, reject });

    setTimeout(() => {
      expect(resolve).toHaveBeenCalledWith({
        data: { data: 'test' },
        response: mockResponse
      });
      expect(reject).not.toHaveBeenCalled();
      done();
    }, 0);
  });

  test('should reject with error for failed response', (done) => {
    const mockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Bad request' })
    };

    const resolve = jest.fn();
    const reject = jest.fn();

    handleJson({ response: mockResponse, resolve, reject });

    setTimeout(() => {
      expect(reject).toHaveBeenCalledWith({
        error: { error: 'Bad request' },
        response: mockResponse
      });
      expect(resolve).not.toHaveBeenCalled();
      done();
    }, 0);
  });
});

describe('handleBson', () => {
  test('should resolve with data for successful response', (done) => {
    const { BSON } = require('bson');
    const testData = { message: 'test bson' };
    const bsonBuffer = BSON.serialize(testData);

    const mockResponse = {
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(bsonBuffer.buffer.slice(bsonBuffer.byteOffset, bsonBuffer.byteOffset + bsonBuffer.byteLength))
    };

    const resolve = jest.fn();
    const reject = jest.fn();

    handleBson({ response: mockResponse, resolve, reject });

    setTimeout(() => {
      expect(resolve).toHaveBeenCalledWith({
        data: testData,
        response: mockResponse
      });
      expect(reject).not.toHaveBeenCalled();
      done();
    }, 0);
  });
});

describe('Custom Mappers', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('successMapper', () => {
    test('should use custom success mapper when provided', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({ message: 'test data' })
      };

      fetch.mockResolvedValue(mockResponse);

      const successMapper = (data, response) => ({
        customData: data,
        customResponse: response,
        timestamp: Date.now()
      });

      const result = await dataFetch('https://api.example.com/test', { successMapper });

      expect(result).toHaveProperty('customData');
      expect(result).toHaveProperty('customResponse');
      expect(result).toHaveProperty('timestamp');
      expect(result.customData).toEqual({ message: 'test data' });
    });

    test('should handle success mapper errors gracefully', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({ message: 'test data' })
      };

      fetch.mockResolvedValue(mockResponse);

      const successMapper = () => {
        throw new Error('Mapper error');
      };

      await expect(dataFetch('https://api.example.com/test', { successMapper })).rejects.toEqual({
        error: expect.any(Error),
        response: mockResponse
      });
    });
  });

  describe('errorMapper', () => {
    test('should use custom error mapper when provided', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({ error: 'Not found' })
      };

      fetch.mockResolvedValue(mockResponse);

      const errorMapper = (data, response) => ({
        customError: data,
        customResponse: response,
        errorCode: 'CUSTOM_404'
      });

      await expect(dataFetch('https://api.example.com/test', { errorMapper })).rejects.toEqual({
        customError: { error: 'Not found' },
        customResponse: mockResponse,
        errorCode: 'CUSTOM_404'
      });
    });

    test('should handle error mapper errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        headers: {
          map: {
            'content-type': 'application/json'
          }
        },
        json: jest.fn().mockResolvedValue({ error: 'Not found' })
      };

      fetch.mockResolvedValue(mockResponse);

      const errorMapper = () => {
        throw new Error('Error mapper error');
      };

      await expect(dataFetch('https://api.example.com/test', { errorMapper })).rejects.toEqual({
        error: expect.any(Error),
        response: mockResponse
      });
    });
  });

  describe('Both mappers', () => {
    test('should use both success and error mappers', async () => {
      const successMapper = (data, response) => ({ success: true, data, response });
      const errorMapper = (data, response) => ({ success: false, data, response });

      // Test success case
      const successResponse = {
        ok: true,
        headers: { map: { 'content-type': 'application/json' } },
        json: jest.fn().mockResolvedValue({ message: 'success' })
      };
      fetch.mockResolvedValueOnce(successResponse);

      const successResult = await dataFetch('https://api.example.com/test', {
        successMapper,
        errorMapper
      });

      expect(successResult).toEqual({
        success: true,
        data: { message: 'success' },
        response: successResponse
      });

      // Test error case
      const errorResponse = {
        ok: false,
        headers: { map: { 'content-type': 'application/json' } },
        json: jest.fn().mockResolvedValue({ error: 'failed' })
      };
      fetch.mockResolvedValueOnce(errorResponse);

      await expect(dataFetch('https://api.example.com/test', {
        successMapper,
        errorMapper
      })).rejects.toEqual({
        success: false,
        data: { error: 'failed' },
        response: errorResponse
      });
    });
  });
});
