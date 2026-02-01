// @godbliss/react hooks exports

// ============================================================================
// Hook Exports
// ============================================================================
// React Hooks functionality

// useSchema Hook - Schema-based form rendering and validation
const useSchema = require('./use-schema/index.js');

// useDynamicSchemaForm Hook - Dynamic schema and form state management
const useDynamicSchemaForm = require('./use-dynamic-schema-form/index.js');

// useGate Hook - API Gateway invocation context management
const useGate = require('./use-gate/index.js');

// // useGet Hook - Hook generation factory for HTTP GET requests
// const useGet = require('./use-get/index.js');

// // useAction Hook - Hook generation factory for action-based mutations
// const useAction = require('./use-action/index.js');


// ============================================================================
// useSchema Sub-functions re-export
// ============================================================================
// Re-exporting for individual import in projects

module.exports = {
  // Main Hooks
  useSchema,
  useDynamicSchemaForm,
  useGate,

  // useGet,
  // useAction,

  // useSchema sub-functions
  useSchemaValidations: useSchema.useSchemaValidations,
  useSchemaInputs: useSchema.useSchemaInputs,
  setDefaultFormFieldRendererCreator: useSchema.setDefaultFormFieldRendererCreator,
  setDefaultSchemaInputsDebug: useSchema.setDefaultSchemaInputsDebug,

  // // useGet sub-functions
  // createUseGet: useGet.createUseGet,

  // // useAction sub-functions
  // createUseGateAction: useAction.createUseGateAction,
  // createUseGenericAction: useAction.createUseGenericAction
};
