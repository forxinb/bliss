const React = require('react');
const _ = require('lodash');
const { useLocalObservable } = require('mobx-react-lite');
const { toJS, action: mobxAction } = require('mobx');
const { SimpleSchema } = require('@godbliss/core/utils');

// Default initialForm function (stable reference to prevent unnecessary re-renders)
const DEFAULT_INITIAL_FORM = ({ newSchema, oldForm }) => newSchema ? newSchema.getForm() : {};

/**
 * Hook for managing dynamic schema and form state
 *
 * This hook handles:
 * - Schema processing (static or dynamic function-based)
 * - Form initialization based on schema
 * - Form re-initialization when schema changes
 * - State tracking for form assignment timestamps
 *
 * @param {Object|Function} schemaSource - Schema source (static schema or function)
 * @param {Object|Function} initialForm - Initial form data or form initialization function
 * @returns {Object} - { currentSchema, form, formAssignedAt }
 */
const useDynamicSchemaForm = (schemaSource, initialForm = DEFAULT_INITIAL_FORM) => {

  // ==========================================================================
  // Schema Processing (supports both static and dynamic schema)
  // ==========================================================================

  let newSchema;

  if (_.isFunction(schemaSource)) {
    // Function-based schema requirements:
    // - Must return the same schema instance for the same schemaSelector
    // - Returning new instances on every render causes infinite re-initialization
    //   because newSchema !== currentSchema will always be true
    // - To change schema intentionally, change schemaSelector value (e.g., version key)
    // - Related test: __tests__/use-gate-render-stability.test.js
    //   test.skip('should reinitialize repeatedly when schema returns new instance each render')
    // Function-based schema: execute function to get schema
    newSchema = schemaSource();
  } else {
    // Static schema: use directly
    newSchema = schemaSource;
  }

  if (newSchema) {
    // Schema validation
    // Note: Use SimpleSchema.isSimpleSchema() instead of instanceof
    // - In monorepo/workspace environments (pnpm symlinks, nested node_modules),
    //   multiple copies of simpl-schema can exist across different paths/realms
    // - instanceof fails when constructors differ by resolved path
    // - SimpleSchema.isSimpleSchema() uses relaxed check (instanceof OR _schema property)
    //   which is more robust across module boundaries
    // - Trade-off: More permissive but works reliably in complex environments
    if (!SimpleSchema.isSimpleSchema(newSchema)) {
      throw new Error('Invalid schema');
    }
  } else {
    newSchema = null;
  }

  // ==========================================================================
  // State Management (for schema change detection and form tracking)
  // ==========================================================================

  const [currentSchema, setCurrentSchema] = React.useState(newSchema);
  const [formAssignedAt, setFormAssignedAt] = React.useState(new Date().getTime());

  // ==========================================================================
  // Form Initialization
  // ==========================================================================

  const state = useLocalObservable(() => {
    return {
      form: _.isFunction(initialForm)
        ? initialForm({ newSchema: currentSchema, oldForm: {} })
        : initialForm || {}
    };
  });

  // ==========================================================================
  // Form Re-initialization on Schema Change
  // - Detects schema changes via reference comparison (newSchema !== currentSchema)
  // - Preserves old form values by passing oldForm to initialForm function
  // - Important: Child schemas must be different instances to trigger re-observation
  //   Example: createFamilySchema.ownerMember vs createBusinessSchema.ownerMember
  //   If parent schema changes but child schema reference stays same, useSchema won't re-render
  // ==========================================================================

  React.useEffect(() => {
    if (newSchema !== currentSchema) {
      // Create new form for new schema
      const oldForm = toJS(state.form); // Convert mobx to plain object
      const newInitialForm = _.isFunction(initialForm)
        ? initialForm({ newSchema, oldForm })
        : initialForm || {};

      mobxAction(() => {
        state.form = newInitialForm;
      })();
      setFormAssignedAt(new Date().getTime());
      setCurrentSchema(newSchema);
    }
    return;
  }, [newSchema, currentSchema, initialForm]);

  return {
    currentSchema,    // Current schema (can change dynamically)
    form: state.form, // Form data (MobX observable)
    formAssignedAt    // Form assignment timestamp (for observability)
  };
};

module.exports = useDynamicSchemaForm;
