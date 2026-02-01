/**
 * Mock Express request/response objects for gating middleware testing
 */
const { ObjectId } = require('@godbliss/core/utils');

// Mock Express request object
const createMockRequest = (overrides = {}) => {
  return {
    baseUrl: '',
    path: '/users/',
    route: { path: '/users/' },
    method: 'POST',
    params: {},
    query: {},
    body: {},
    ...overrides
  };
};

// Mock Express response object
const createMockResponse = () => {
  const res = {
    gate: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  };
  return res;
};

// Mock Express next function
const createMockNext = () => {
  return jest.fn();
};

// Common request scenarios
const mockRequests = {
  // Basic POST request
  postUser: createMockRequest({
    method: 'POST',
    body: {
      user: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    }
  }),

  // Request with URL parameters
  getUserById: createMockRequest({
    method: 'GET',
    params: { userId: '507f1f77bcf86cd799439011' },
    route: { path: '/users/:userId' }
  }),

  // Request with query parameters
  searchUsers: createMockRequest({
    method: 'GET',
    query: { 
      name: 'John',
      age: '30'
    }
  }),

  // Request with both params and query
  updateUser: createMockRequest({
    method: 'PUT',
    params: { userId: '507f1f77bcf86cd799439011' },
    query: { version: '1' },
    body: {
      user: {
        name: 'Updated Name'
      }
    },
    route: { path: '/users/:userId' }
  }),

  // Request with formPath
  createUserWithPath: createMockRequest({
    method: 'POST',
    body: {
      user: {
        name: 'Path User',
        email: 'path@example.com'
      }
    }
  }),

  // Request without formPath (direct body)
  createUserDirect: createMockRequest({
    method: 'POST',
    body: {
      name: 'Direct User',
      email: 'direct@example.com'
    }
  }),

  // Request with ObjectId parameter
  getUserWithObjectId: createMockRequest({
    method: 'GET',
    params: { userId: new ObjectId().toString() },
    route: { path: '/users/:userId' }
  })
};

module.exports = {
  createMockRequest,
  createMockResponse,
  createMockNext,
  mockRequests
};
