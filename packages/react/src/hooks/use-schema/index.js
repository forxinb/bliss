// ============================================================================
// use-schema Hook module entry point
// ============================================================================
// 
// This module exports the useSchema Hook and related configuration functions.
// Written in CommonJS to ensure stability in all environments.
//
// 🎯 Module System Strategy: CommonJS + exports field
// - require: 100% guaranteed to work
// - import: Works in most modern environments
// - Stability first principle applied

// ============================================================================
// ============================================================================
// Main Hook Export
// ============================================================================

// Set useSchema Hook as default export
const useSchema = require('./use-schema');
module.exports = useSchema;

// ============================================================================
// ============================================================================
// Configuration Functions Export
// ============================================================================

// Project-specific default configuration functions
module.exports.setDefaultFormFieldRendererCreator = require('./use-schema').setDefaultFormFieldRendererCreator;
module.exports.setDefaultSchemaInputsDebug = require('./use-schema').setDefaultSchemaInputsDebug;

// ============================================================================
// ============================================================================
// Individual Hooks Export
// ============================================================================

// Individually usable Hooks
module.exports.useSchemaValidations = require('./use-schema-validations');
module.exports.useSchemaInputs = require('./use-schema-inputs');

// ============================================================================
// ============================================================================
// Usage Examples
// ============================================================================
// 
// ES6 (Recommended, works in most environments)
// import useSchema, { 
//   setDefaultFormFieldRendererCreator, 
//   setDefaultSchemaInputsDebug,
//   useSchemaValidations,
//   useSchemaInputs
// } from '@godbliss/react/hooks/use-schema';
//
// CommonJS (Guaranteed compatibility, 100% works)
// const useSchema = require('@godbliss/react/hooks/use-schema');
// const { 
//   setDefaultFormFieldRendererCreator, 
//   setDefaultSchemaInputsDebug,
//   useSchemaValidations,
//   useSchemaInputs
// } = require('@godbliss/react/hooks/use-schema');
//
// Project Configuration
// setDefaultFormFieldRendererCreator(myRendererCreator);
// setDefaultSchemaInputsDebug(MyDebugComponent);
//
// Hook Usage Patterns
// 1. Integrated usage (Recommended)
// const { formFieldRenderers } = useSchema({ schema, form });
//
// 2. Individual usage
// const { fullValidationErrors } = useSchemaValidations({ schema, form });
// const { formFieldRenderers } = useSchemaInputs({ schema, form, createFormFieldRenderer });
