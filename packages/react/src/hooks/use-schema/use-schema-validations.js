const _ = require('lodash');
const React = require('react');
const { toJS } = require('mobx');
const { ObjectId } = require('@godbliss/core/utils');

/**
 * Creates field states tracking for progressive validation.
 * 
 * Called when:
 * - Component first mounts (initial render)
 * - Schema changes (via useEffect dependency on currentSchema)
 * 
 * Current purpose: Track user input status for progressive validation
 * Future extensibility: Can be expanded to track additional field-level states
 *                        e.g., { hasUpdatedAfterRender, initialValue, lastValidated?, validationCache?, isDirty?, ... }
 * 
 * @param {Object} form - Form structure that defines validation tracking scope and initial values.
 *                        Must contain all fields that need validation tracking.
 *                        Missing fields won't get fieldStates, preventing validation.
 * @returns {Object} fieldStates - Tracks state for each form field
 *                   - key: field path (e.g., "user.name", "email") 
 *                   - value: { hasUpdatedAfterRender: boolean, initialValue: any }
 */
const createFieldStates = (form) => {
  const fieldStates = {};

  const _setFieldStates = (_form, parentKey) => {
    _.each(_form, (value, key) => {
      // key is the current key in the _form object
      // path is the full dot-notation path used as fieldStates key (e.g., "user.profile.name")
      const path = parentKey ? `${parentKey}.${key}` : key;      
      
      // Only recurse into plain objects (object literals: {})
      // Built-in objects like Date, Array, ObjectId, RegExp, Error etc. should be added to fieldStates as values
      if (_.isPlainObject(_form[key])) {
        _setFieldStates(value, path);
      } else if (_.isFunction(_form[key])) {
        // Functions are excluded from fieldStates (no form validation needed for functions)
        // Do nothing - skip functions completely
      } else {
        // Add all non-plain-object, non-function values to fieldStates:
        // - Primitives: string, number, boolean, null, undefined
        // - Built-in objects: Date, Array, ObjectId, RegExp, Error, etc.
        // TODO: How to handle nested structures within arrays?
        //       Current: Array is treated as single value -> fieldStates['users'] = [...]
        //       Future: Should we track individual array items? -> fieldStates['users.0.name'], fieldStates['users.1.profile.age']
        //       This would enable field-level validation for dynamic arrays (add/remove items, validate specific fields)

        fieldStates[path] = {
          hasUpdatedAfterRender: false,    // Whether this field has been modified by user
          initialValue: _form[key]         // The initial value for this field
        };
      }
      return true;    // prevent break
    });
  };
  
  _setFieldStates(form);

  return fieldStates;
};

// Debug counter for render tracking (moved to useRef for per-instance tracking)

/**
 * Progressive validation hook for schema-based forms.
 * Only shows validation errors for fields that user has actually modified.
 * 
 * @param {Object} params - Hook parameters
 * @param {Object|Function} params.schema - Schema instance created by makeSchema() or function returning schema
 *                                          MUST be a valid schema instance with getForm() and validate() methods
 *                                          Passing invalid schema (e.g., {}) will cause unintended bugs
 * @param {Object|Function} params.form - Form data object or function returning form data (should be MobX observable)
 * @param {boolean} params.verbose - Enable debug logging for useMemo re-execution tracking (default: false)
 * @returns {Object} Validation errors object:
 *                   - fullValidationErrors: All validation errors from schema.validate(currentForm)
 *                   - inputtingValidationErrors: Only errors for fields user has modified at least once
 */
const useSchemaValidations = (params = {}) => {
  const {
    schema = {}, // Schema object or function that returns schema
    form = {},   // Form data object or function that returns form data
    verbose = false // Enable debug logging for useMemo re-execution tracking
  } = params;
  
  const currentSchema = _.isFunction(schema) ? schema() : schema;
  // TODO: Add schema instance validation to prevent unintended bugs
  // Should check if currentSchema has required methods (getForm, validate)
  // if (!currentSchema?.getForm || !currentSchema?.validate) {
  //   throw new Error(`useSchemaValidations: Invalid schema provided. Must be created by makeSchema(): ${currentSchema}`);
  // }

  const holder = React.useRef({ fieldStates: {} }).current;
  const renderCountRef = React.useRef(0); // Per-instance render counter for debugging
  
  React.useEffect(() => {
    // WARNING: DO NOT USE currentForm in this effect - it causes infinite re-renders!
    // TODO: Investigate why currentForm has undefined values removed
    // TODO: When form fields are missing (undefined removed), fieldStates won't be created
    //       This prevents input validation errors from ever showing. Need fallback strategy.

    // Create full form by merging empty schema form with actual form data
    // Using _emptyForm ensures all required fields exist even when form data is cleaned/minimal
    const _emptyForm = currentSchema.getForm();
    const _form = toJS(_.isFunction(form) ? form() : form);
    const _fullForm = _.merge({}, _emptyForm, _form);
    // Debug logging (disabled in production)
    // console.log('useSchemaValidations _fullForm', _fullForm, _emptyForm, _form);

    // Reset field states when schema changes
    // This ensures validation state is fresh for new schema structure
    
    // Create field states using current form snapshot to capture initial values
    // Each field's initialValue will be set to its value at this moment
    holder.fieldStates = createFieldStates(_fullForm);
    return;
  }, [currentSchema]);

  const currentForm = toJS(_.isFunction(form) ? form() : form);

  const { fullValidationErrors, inputtingValidationErrors } = React.useMemo(() => {

    _.each(holder.fieldStates, (item, path) => {
      if (!item.hasUpdatedAfterRender) {
        const currentValue = _.get(currentForm, path);
        if (currentValue && !_.isEqual(item.initialValue, currentValue)) {
          _.set(holder.fieldStates, `${path}.hasUpdatedAfterRender`, true);
        }
      }
      return true;   // prevent break
    });

    let _fullValidationErrors = {};   // All validation errors regardless of user interaction
    try {
      // Run schema validation against current form data
      currentSchema.validate(currentForm);
    } catch (error) {
      switch (error.error) {
        case 'validation-error':
          _.each(error.details, (detail) => {
            const { name: path, type, value, message } = detail;
            _fullValidationErrors[path] = {
              type: type,
              value: value,
              message: message
            };
            return true;    // prevent break
          });
          break;
      }
    }

    // Filter to only show errors for fields that user has actually modified
    const _inputtingValidationErrors = {};   // Only validation errors for user-modified fields
    _.each(_fullValidationErrors, (validationError, path) => {
      if (_.get(holder.fieldStates, `${path}.hasUpdatedAfterRender`, false)) {
        _inputtingValidationErrors[path] = validationError;
      }
      return true;    // prevent break
    });
    
    // Debug logging for validation errors (controlled by verbose param)
    if (verbose) {
      console.group('%c useSchemaValidations will update', 'background: #222; color: #dba4a0');
      console.log('%c validation errors: ', 'background: #222; color: #dba4a0', { 
        currentForm, 
        fullValidationErrors: _fullValidationErrors, 
        inputtingValidationErrors: _inputtingValidationErrors, 
        fieldStates: holder.fieldStates 
      });
      console.groupEnd();
    }

    return { fullValidationErrors: _fullValidationErrors, inputtingValidationErrors: _inputtingValidationErrors };

  }, [currentSchema, currentForm]);

  // Debug: Track render count (controlled by verbose param)
  if (verbose) {
    renderCountRef.current += 1;
    console.log('useSchemaValidations - render count:', renderCountRef.current);
  }

  return { fullValidationErrors, inputtingValidationErrors };
};

module.exports = useSchemaValidations;
module.exports.createFieldStates = createFieldStates;
