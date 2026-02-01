/**
 * Mock GateContext for useGate Hook testing
 */
const { ObjectId } = require('@godbliss/core/utils');

// Base gateContext
const basicGateContext = {
  schemaSelector: {},
  routeParams: {},
  queryParams: {},
  additionalQueryKey: []
};

// gateContext with route parameters
const gateContextWithRouteParams = {
  schemaSelector: {},
  routeParams: {
    userId: '507f1f77bcf86cd799439011'
  },
  queryParams: {},
  additionalQueryKey: []
};

// gateContext with query parameters
const gateContextWithQueryParams = {
  schemaSelector: {},
  routeParams: {},
  queryParams: {
    page: 1,
    limit: 10,
    sort: 'name',
    filter: ['active', 'verified']
  },
  additionalQueryKey: []
};

// Complex gateContext
const complexGateContext = {
  schemaSelector: {
    userId: '507f1f77bcf86cd799439011',
    includePosts: true
  },
  routeParams: {
    userId: '507f1f77bcf86cd799439011',
    postId: '507f1f77bcf86cd799439012'
  },
  queryParams: {
    page: 1,
    limit: 10,
    include: ['posts', 'comments']
  },
  additionalQueryKey: ['v2', 'cache']
};

// gateContext for dynamic schema testing
const dynamicSchemaGateContext = {
  schemaSelector: {
    userId: '507f1f77bcf86cd799439011'
  },
  routeParams: {
    userId: '507f1f77bcf86cd799439011'
  },
  queryParams: {},
  additionalQueryKey: []
};

// Empty gateContext
const emptyGateContext = {};

// Invalid gateContext (missing route parameter)
const invalidGateContext = {
  schemaSelector: {},
  routeParams: {},  // userId missing
  queryParams: {},
  additionalQueryKey: []
};

// gateContext with ObjectId parameters
const objectIdGateContext = {
  schemaSelector: {},
  routeParams: {
    userId: new ObjectId('507f1f77bcf86cd799439011')
  },
  queryParams: {},
  additionalQueryKey: []
};

// gateContext with array query parameters
const arrayQueryGateContext = {
  schemaSelector: {},
  routeParams: {},
  queryParams: {
    tags: ['react', 'javascript', 'testing'],
    categories: ['frontend', 'backend'],
    ids: ['123', '456', '789']
  },
  additionalQueryKey: []
};

module.exports = {
  basicGateContext,
  gateContextWithRouteParams,
  gateContextWithQueryParams,
  complexGateContext,
  dynamicSchemaGateContext,
  emptyGateContext,
  invalidGateContext,
  objectIdGateContext,
  arrayQueryGateContext
};
