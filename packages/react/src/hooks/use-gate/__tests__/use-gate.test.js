/**
 * useGate Hook - Basic functionality tests
 * 
 * Purpose: Verify basic Hook behavior after dependency changes
 * Note: Uses standard unit tests following React patterns
 */

const { makeSchema, SimpleSchema } = require('@godbliss/core/utils');

// Import useGate Hook
const useGate = require('../use-gate');

// Mock files
const { minimalGateDef, completeGateDef } = require('../__mocks__/mock-gate-def-for-use-gate-test');
const { basicGateContext } = require('../__mocks__/mock-gate-context-for-use-gate-test');

describe('useGate Hook - Basic Functionality', () => {
  // Create base schema
  const testSchema = makeSchema({
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  });

  // Base gate definition
  const testGate = {
    method: 'POST',
    path: '/api/users',
    schema: testSchema,
    formPath: 'user'
  };

  test('should import useGate successfully', () => {
    expect(typeof useGate).toBe('function');
  });

  test('should import dependencies correctly', () => {
    // Verify SimpleSchema from @godbliss/core/utils
    expect(SimpleSchema).toBeDefined();
    expect(typeof makeSchema).toBe('function');

    // Check if useGate function is defined
    expect(useGate).toBeDefined();
    expect(typeof useGate).toBe('function');
  });

  test('should create schema successfully', () => {
    // Test schema generation with makeSchema
    const schema = makeSchema({
      name: { type: String, required: true },
      email: { type: String, required: true }
    });

    expect(schema).toBeDefined();
    expect(schema).toBeInstanceOf(SimpleSchema);
    expect(typeof schema.getForm).toBe('function');
    expect(typeof schema.getDmlForm).toBe('function');
  });

  test('should validate gate structure', () => {
    // Validate Gate structure
    expect(testGate.method).toBe('POST');
    expect(testGate.path).toBe('/api/users');
    expect(testGate.schema).toBeInstanceOf(SimpleSchema);
    expect(testGate.formPath).toBe('user');
  });

  test('should import mock files correctly', () => {
    // Check if mock files are imported correctly
    expect(minimalGateDef).toBeDefined();
    expect(completeGateDef).toBeDefined();
    expect(basicGateContext).toBeDefined();

    expect(minimalGateDef.method).toBe('GET');
    expect(minimalGateDef.path).toBe('/api/users');
    expect(completeGateDef.method).toBe('POST');
    expect(completeGateDef.path).toBe('/api/users');
  });

  test('should validate mock gateDef structure', () => {
    // Validate mock gateDef structure
    expect(completeGateDef.schema).toBeDefined();
    expect(completeGateDef.formPath).toBe('user');
    expect(completeGateDef.paramsToForm).toEqual({ 'userId': '_id' });
    expect(completeGateDef.contentType).toBe('json');
    expect(completeGateDef.lazySchemas).toBeDefined();
    expect(completeGateDef.errorSpec).toBeDefined();
    expect(completeGateDef.successSpec).toBeDefined();
  });

  test('should validate mock request structure', () => {
    // Validate mock request structure
    expect(basicGateContext.schemaSelector).toBeDefined();
    expect(basicGateContext.routeParams).toBeDefined();
    expect(basicGateContext.queryParams).toBeDefined();
    expect(basicGateContext.additionalQueryKey).toBeDefined();
  });
});
