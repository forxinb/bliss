const React = require('react');
const useSchemaValidations = require('./use-schema-validations');
const useSchemaInputs = require('./use-schema-inputs');

// ============================================================================
// Project-level default setting system
// ============================================================================
// This package is designed to be used in cross-platform (React Web, Native) 
// and various UI libraries (MUI, Paper, etc.). Therefore, UI rendering logic must be injected from the project.
//
// 🎯 Dependency Injection Pattern:
// 1. Set defaults with setDefault* functions in the project
// 2. Override individually via useSchema params
// 3. Use fallback functions/components if not set

// Project-specific default form field renderer creator
let defaultFormFieldRendererCreator = null;

// Project-specific default schema inputs debug component
let DefaultSchemaInputsDebug = null;

// ============================================================================
// Project configuration functions
// ============================================================================

/**
 * Set the default form field renderer creator function to be used in the project.
 * 
 * @param {Function} rendererCreator - Function in the form of (type, props) => ReactElement
 * @example
 * // In MUI project
 * setDefaultFormFieldRendererCreator((type, props) => {
 *   switch(type) {
 *     case 'text': return <TextField {...props} />;
 *     case 'select': return <Select {...props} />;
 *   }
 * });
 */
const setDefaultFormFieldRendererCreator = (rendererCreator) => {
  if (typeof rendererCreator !== 'function') {
    console.warn('setDefaultFormFieldRendererCreator: rendererCreator must be a function');
    return;
  }
  defaultFormFieldRendererCreator = rendererCreator;
  console.log('Default form field renderer creator set successfully');
};

/**
 * Set the default schema inputs debug component to be used in the project.
 * 
 * @param {ReactComponent} debugComponent - Debug React component
 * @example
 * // Project-specific debug component
 * setDefaultSchemaInputsDebug(<MyDebugComponent />);
 */
const setDefaultSchemaInputsDebug = (debugComponent) => {
  if (!debugComponent) {
    console.warn('setDefaultSchemaInputsDebug: debugComponent must be provided');
    return;
  }
  DefaultSchemaInputsDebug = debugComponent;
  console.log('Default schema inputs debug component set successfully');
};

// ============================================================================
// Fallback Functions/Components
// ============================================================================
// Safeguards used when defaults are not configured in the project

/**
 * Fallback function when form field renderer is not configured
 * Logs a warning message and returns null.
 */
const fallbackFormFieldRendererCreator = (type, props) => {
  console.warn(
    `Form field renderer creator not configured for type: ${type}. ` +
    `Please call setDefaultFormFieldRendererCreator() or pass createFormFieldRenderer in useSchema params.`
  );
  return () => null;
};

/**
 * Fallback component when debug component is not configured
 * Logs a warning message and returns null.
 */
const FallbackSchemaInputsDebug = () => {
  console.warn(
    'Schema inputs debug component not configured. ' +
    'Please call setDefaultSchemaInputsDebug() or pass Debug in useSchema params.'
  );
  return null;
};

/**
 * useSchema Hook - Schema-based form management
 * 
 * @param {Object} params - Configuration parameters
 * @param {Function|Object} params.schema - Schema function or object
 * @param {Function|Object} params.form - Form data function or object
 * @param {Function} params.createFormFieldRenderer - Form field renderer creator function (Highest priority)
 * @param {Component} params.Debug - Debug component
 * @returns {Object} Form management state and functions
 * 
 * @example
 * // Set project defaults
 * setDefaultFormFieldRendererCreator(myRendererCreator);
 * setDefaultSchemaInputsDebug(MySchemaInputsDebugComponent);
 * 
 * // Individual override
 * const { formFieldRenderers } = useSchema({
 *   schema, form, createFormFieldRenderer: customRendererCreator
 * });
 * 
 * // or
 * const { formFieldRenderers } = useSchema({
 *   schema, form, Debug: CustomSchemaInputsDebugComponent
 * });
 */
const useSchema = (params = {}) => {
  // ============================================================================
  // Destructure parameters and set defaults
  // ============================================================================
  const {
    schema = () => ({}),                    // Schema function or object
    form = () => ({}),                      // Form data function or object
    createFormFieldRenderer,                // 🥇 Priority: renderer creator passed via params
    Debug                                   // 🥇 Priority: debug component passed via params
  } = params;

  // ============================================================================
  // Use Schema Validation Hook
  // ============================================================================
  const { fullValidationErrors, inputtingValidationErrors } = useSchemaValidations({
    schema,
    form
  });

  // ============================================================================
  // Priority-based Dependency Injection System
  // ============================================================================

  // 🎯 Select Form Field Renderer Creator Priority
  // Priority 1: Passed via params (Highest)
  // Priority 2: Project default setting
  // Priority 3: Fallback function (Warning + returns null)
  const finalFormFieldRendererCreator =
    createFormFieldRenderer ||
    defaultFormFieldRendererCreator ||
    fallbackFormFieldRendererCreator;

  // 🎯 Select Debug Component Priority
  // Priority 1: Passed via params (Highest)
  // Priority 2: Project default setting
  // Priority 3: Fallback component (Warning + returns null)
  const finalSchemaInputsDebug =
    Debug ||
    DefaultSchemaInputsDebug ||
    FallbackSchemaInputsDebug;

  // ============================================================================
  // Use Schema Inputs Processing Hook
  // ============================================================================
  // Pass selected renderer creator and debug component to useSchemaInputs
  const {
    formFieldRenderers,        // Created form field renderers
    useFullValidations,        // Whether to use full validation
    setUseFullValidations,     // Full validation toggle function
    renderDebug                // Debug rendering function
  } = useSchemaInputs({
    schema,
    form,
    createFormFieldRenderer: finalFormFieldRendererCreator, // Finally selected renderer creator
    fullValidationErrors,      // Full validation errors
    inputtingValidationErrors, // Validation errors after user input
    Debug: finalSchemaInputsDebug,                          // Finally selected debug component
  });

  // ============================================================================
  // Return Value - Hook Chain Result
  // ============================================================================
  // Combine results of useSchemaValidations + useSchemaInputs and return
  return {
    // Form Field Rendering
    formFieldRenderers,        // Form field renderers created based on schema

    // Validation Control
    useFullValidations,        // Whether to use full validation
    setUseFullValidations,     // Full validation toggle function

    // Validation Results
    fullValidationErrors,      // All validation errors
    inputtingValidationErrors, // Validation errors after user input

    // Debugging
    renderDebug,               // Debug info rendering function
  };
};

module.exports = useSchema;
module.exports.setDefaultFormFieldRendererCreator = setDefaultFormFieldRendererCreator;
module.exports.setDefaultSchemaInputsDebug = setDefaultSchemaInputsDebug;
