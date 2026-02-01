/**
 * useSchemaInputs Hook
 * 
 * 🚨 IMPORTANT: The Nature of formFieldRenderer and Mocking Principles
 * 
 * 1. The Nature of formFieldRenderer
 *    - formFieldRenderer is a render function that draws actual UI in React/React Native
 *    - It's a complex function containing React-specific logic, not just a simple data object
 *    - Includes React lifecycle features like useState, useEffect, event handling, state management, etc.
 * 
 * 2. Cautious Mocking
 *    - Mocks should only verify the basic structure
 *    - Do NOT try to reproduce complex React logic in Mocks
 *    - As Mocks get more complex, the risk of divergence from actual behavior increases
 *    - Real React behavior should be verified in Integration tests
 * 
 * 3. Role of Current Implementation
 *    - Generates formFieldRenderer functions based on schema
 *    - Provides appropriate render function for each field
 *    - Passes basic metadata (path, type, required, etc.)
 * 
 * 📚 Reference: dev-docs/lessons-learned/test-failure-handling-pattern-issue.md
 * "Do not modify code on test failure" - Basic principle of AI collaboration
 */

const _ = require('lodash');
const React = require('react');
const { SimpleSchema } = require('@godbliss/core/utils');

/**
 * Creates render functions for form fields based on schema definition.
 * 
 * @param {Object} schemaInstance - Schema instance with objectKeys(), getType(), getIsRequired() methods
 * @param {Object} formState - Current form data state
 * @param {Function} createFormFieldRenderer - Function that creates render components for form fields
 * @param {Object} holder - Validation errors holder object
 * @param {string} parentKey - Parent key for nested schemas (optional)
 * @returns {Object} Object containing render functions for each schema field
 */
const createFormFieldRenderers = (schemaInstance, formState, createFormFieldRenderer, holder, parentKey) => {
  const formFieldRenderers = {}; // reset
  const objectKeys = schemaInstance.objectKeys();

  _.each(objectKeys, (key) => {
    const type = schemaInstance.getType(key);
    const input = schemaInstance.getInput(key);
    const required = schemaInstance.getIsRequired(key);
    const readOnly = schemaInstance.getIsReadOnly(key);
    const allowedValues = schemaInstance.getAllowedValuesForKey(key);
    const regEx = schemaInstance.getRegEx(key);
    const schemaLabel = schemaInstance.getDefinition(key)?.label;
    const schemaHelp = schemaInstance.getDefinition(key)?.help;
    const schemaRemark = schemaInstance.getDefinition(key)?.remark;

    const path = parentKey ? `${parentKey}.${key}` : key;
    if (SimpleSchema.isSimpleSchema(type)) {
      const nestedSchema = schemaInstance.getNestedSchema(key);
      formFieldRenderers[key] = createFormFieldRenderers(nestedSchema, formState, createFormFieldRenderer, holder, path);
    } else {
      formFieldRenderers[key] = createFormFieldRenderer({
        state: formState,
        path: path,
        type: type,
        input: input,
        required: required,
        readOnly: readOnly,
        allowedValues: allowedValues,
        regEx: regEx,
        schemaLabel: schemaLabel,
        schemaHelp: schemaHelp,
        schemaRemark: schemaRemark,
        getValidationErrors: () => holder.validationErrors
      });
    }

    return true;    // prevent break
  });

  return formFieldRenderers;
};

/**
 * Schema-based form input generation hook.
 * Generates render functions for form fields based on schema definition.
 * 
 * @param {Object} params - Hook parameters
 * @param {Object|Function} params.schema - Schema instance created by makeSchema() or function returning schema
 *                                          MUST be a valid schema instance with objectKeys(), getType(), getIsRequired() methods
 *                                          Passing invalid schema (e.g., {}) will cause unintended bugs
 * @param {Object|Function} params.form - Form data object or function returning form data (should be MobX observable)
 * @param {Function} params.createFormFieldRenderer - Function that creates render components for form fields
 * @param {Object} params.fullValidationErrors - All validation errors from schema validation
 * @param {Object} params.inputtingValidationErrors - Only validation errors for user-modified fields
 * @param {Function} params.Debug - Debug component for development/testing
 * @returns {Object} Form input generation utilities:
 *                   - formFieldRenderers: Object containing render functions for each schema field
 *                   - useFullValidations: Boolean state for validation mode
 *                   - setUseFullValidations: Function to toggle validation mode
 *                   - renderDebug: Function to render debug component
 */
const useSchemaInputs = (params = {}) => {
  const {
    schema = () => ({}),
    form = () => ({}),
    createFormFieldRenderer = () => () => null,
    fullValidationErrors = {},
    inputtingValidationErrors = {},
    Debug = () => null
  } = params;

  const schemaInstance = _.isFunction(schema) ? schema() : schema;

  // Validate that schema is a valid instance with required methods
  if (!schemaInstance || !schemaInstance.objectKeys || typeof schemaInstance.objectKeys !== 'function') {
    throw new Error(`useSchemaInputs: Invalid schema provided. Must be created by makeSchema() and have objectKeys() method: ${schemaInstance}`);
  }

  const [useFullValidations, setUseFullValidations] = React.useState(false);

  // Updated validation errors(by useSchemaValidations) can not be passed to memoized renderFormFiled function.
  // Instead of passing validation errors to renderFormFiled function directly,
  // validation errors will be delivered via holder; holder itself keeps pointer, so it will be effective in memoized function.
  // cf) score used hoc and the above issue has solved by React Context
  // const [holder] = React.useState({
  //   validationErrors: {}
  // });
  const holder = React.useRef({ validationErrors: {} }).current;
  holder.validationErrors = useFullValidations ? fullValidationErrors : inputtingValidationErrors;

  // TODO: dev only pretty log
  // console.group('%c useSchemaInputs holder will deliver', 'background: #222; color: #a0dbd9');
  // console.log('%c validation errors to memoized formFieldRenderer functions: ', 'background: #222; color: #a0dbd9', { holder, fullValidationErrors, inputtingValidationErrors, useFullValidations });
  // console.groupEnd();

  const formFieldRenderers = React.useMemo(() => {
    // // TODO: dev only pretty log
    // console.group('%c useSchemaInputs will memoize formFieldRenderer functions with', 'background: #222; color: #bada55');
    // console.log('%c schema: ', 'background: #222; color: #bada55', schemaInstance);
    // console.groupEnd();

    // TODO: supporting nested schema
    // - array issue; ex. images: [], 'images.$': nestedSchema rendering issue

    const formState = _.isFunction(form) ? form() : form;
    return createFormFieldRenderers(schemaInstance, formState, createFormFieldRenderer, holder);
  }, [schemaInstance]);

  const renderDebug = React.useCallback((params = {}) => {
    return Debug({
      form: _.isFunction(form) ? form() : form,
      formFieldRenderers: formFieldRenderers,
      useFullValidations: useFullValidations,
      setUseFullValidations: setUseFullValidations,
      ...params
    });
  }, [formFieldRenderers]);

  return {
    formFieldRenderers,
    useFullValidations,
    setUseFullValidations,
    renderDebug
  };
};

module.exports = useSchemaInputs;
module.exports.createFormFieldRenderers = createFormFieldRenderers;


