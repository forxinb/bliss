/**
 * Mock createFormFieldRenderer function for testing useSchemaInputs
 * 
 * 🚨 IMPORTANT: Mock Design Principles and Rationale
 * 
 * 1. The Nature of formFieldRenderer
 *    - formFieldRenderer is a render function producing actual UI in React/React Native
 *    - It's a complex function containing React-specific logic, not just a simple data object
 *    - Contains React lifecycle features like useState, useEffect, event handling, state management
 * 
 * 2. Why Avoid Complex Mocks
 *    - Passing Mock tests ≠ Guarding actual behavior in React environment
 *    - Hard to reproduce React lifecycle, event handling, state changes with Mocks
 *    - As Mocks get complex, risk of divergence from real behavior increases
 *    - Reduces test maintainability and potentially lowers reliability
 * 
 * 3. Role of Current Mock
 *    - Verify basic structure: Ensure formFieldRenderer is a function
 *    - Existence of default properties: path, type, required, etc.
 *    - Do not mock complex React logic
 * 
 * 4. Mock Usage Cautions
 *    - This Mock should only be used for structural validation
 *    - Real React behavior should be verified in Integration tests
 *    - As Mocks get more complex, reliability actually decreases
 * 
 * 📚 Reference: dev-docs/lessons-learned/test-failure-handling-pattern-issue.md
 * "Do not modify code on test failure" - Basic principle of AI collaboration
 */

// Basic mock that returns a render function for each field
const mockCreateFormFieldRenderer = (fieldConfig) => {
  // Provide defaults if fieldConfig is undefined
  if (!fieldConfig) {
    return () => ({
      type: 'mock-field',
      path: 'unknown',
      fieldType: String,
      required: false,
      readOnly: false,
      label: 'Unknown Field',
      help: 'No help available',
      remark: 'No remark available',
      allowedValues: null,
      regEx: undefined,
      getValidationErrors: () => ({})
    });
  }

  const { path, type, required, readOnly, schemaLabel, schemaHelp, schemaRemark, allowedValues, regEx, getValidationErrors } = fieldConfig;

  // Return a mock render function that can be used for testing
  return () => ({
    type: 'mock-field',
    path: path || 'unknown',
    fieldType: type || String,
    required: required || false,
    readOnly: readOnly || false,
    label: schemaLabel || 'Field',
    help: schemaHelp || 'No help available',
    remark: schemaRemark || 'No remark available',
    allowedValues: allowedValues || null,
    regEx: regEx || undefined,
    // Use the provided getValidationErrors function or fallback to empty object
    getValidationErrors: getValidationErrors || (() => ({}))
  });
};

// Mock that returns different components based on field type
const mockCreateFormFieldRendererByType = (fieldConfig) => {
  // Provide defaults if fieldConfig is undefined
  if (!fieldConfig) {
    return () => ({
      type: 'default-input',
      path: 'unknown',
      fieldType: 'unknown',
      required: false,
      readOnly: false,
      allowedValues: null,
      regEx: undefined
    });
  }

  const { path, type, required, readOnly, allowedValues, regEx } = fieldConfig;

  switch (type) {
    case String:
      return () => ({
        type: 'text-input',
        path: path || 'unknown',
        fieldType: 'string',
        required: required || false,
        readOnly: readOnly || false,
        allowedValues: allowedValues || null,
        regEx: regEx || undefined
      });
    case Number:
      return () => ({
        type: 'number-input',
        path: path || 'unknown',
        fieldType: 'number',
        required: required || false,
        readOnly: readOnly || false,
        allowedValues: allowedValues || null,
        regEx: regEx || undefined
      });
    case Boolean:
      return () => ({
        type: 'checkbox',
        path: path || 'unknown',
        fieldType: 'boolean',
        required: required || false,
        readOnly: readOnly || false,
        allowedValues: allowedValues || null,
        regEx: regEx || undefined
      });
    case Object:
      return () => ({
        type: 'object-field',
        path: path || 'unknown',
        fieldType: 'object',
        required: required || false,
        readOnly: readOnly || false,
        allowedValues: allowedValues || null,
        regEx: regEx || undefined
      });
    default:
      return () => ({
        type: 'default-input',
        path: path || 'unknown',
        fieldType: 'unknown',
        required: required || false,
        readOnly: readOnly || false,
        allowedValues: allowedValues || null,
        regEx: regEx || undefined
      });
  }
};

// Mock that throws error for testing error handling
const mockCreateFormFieldRendererWithError = (fieldConfig) => {
  const fieldPath = fieldConfig?.path || 'unknown';
  throw new Error(`Mock error for field: ${fieldPath}`);
};

module.exports = {
  mockCreateFormFieldRenderer,
  mockCreateFormFieldRendererByType,
  mockCreateFormFieldRendererWithError
};
