const React = require('react');
const _ = require('lodash');
const useActionCore = require('./use-action-core');
const useActionPreprocessor = require('./use-action-preprocessor');
const resolveCreateActionHookConfig = require('./resolve-create-action-hook-config');
const useDynamicSchemaForm = require('../use-dynamic-schema-form');

/**
 * Factory function to create useGenericAction hook
 * 
 * Uses the same action definition rules as useGateAction, but directly executes
 * actionDef.execute function instead of React Query's useMutation.
 * No gating required - form and schema are provided at hook call time.
 *
 * @typedef {Object} ActionDef
 * @property {Function} execute - Custom action function to execute (required)
 *   - Signature: async ({ form, ...executionParams }) => result
 *   - executionParams: Runtime parameters passed from start()
 * @property {Object|Function} [schema] - Form validation schema (SimpleSchema instance or function)
 *   - Static: SimpleSchema instance (stable reference)
 *   - Dynamic: (schemaSelector) => SimpleSchema instance
 * @property {Function} [check] - Pre-execution check logic
 * @property {Object|Function} [confirmAction] - Confirmation dialog definition
 * @property {Object|Function} [alertSuccess] - Success alert definition
 * @property {Object|Function} [alertError] - Error alert definition
 * @property {Object|Function} [alertCheckError] - Check error alert definition
 * @property {('back'|Function)} [goOnSuccess] - Navigation after success
 * @property {('back'|Function)} [goOnError] - Navigation after error
 * @property {Object|Function} [invalidateQueriesOnSuccess] - Query invalidation on success
 *
 * @typedef {Object.<string, ActionDef>} ActionDefs
 *
 * @typedef {Object} GenericActionOptions
 * @property {Object} [schemaSelector] - Schema selector for dynamic schema (passed to actionDef.schema function)
 * @property {Function|Object} [initialForm] - Form initialization
 *   - Function: ({ newSchema, oldForm }) => form (preserves old values on schema change)
 *   - Object: Direct form value
 * @property {*} [customQueryClient] - Custom QueryClient instance for query invalidation
 * @property {Function} [onBeforeExecute] - Hook before action execution
 * @property {Function} [onBeforeGoOnError] - Hook before error handling
 * @property {Function} [onBeforeGoOnSuccess] - Hook before success handling
 * @property {Function} [showAlert] - Per-call UI adapter override
 * @property {Function} [showConfirm] - Per-call UI adapter override
 * @property {Object}   [executionOptions] - Runtime execution options for start() calls
 * @property {Function} [executionOptions.onSuccess] - Success callback (executes after actionDef handlers)
 * @property {Function} [executionOptions.onError] - Error callback (executes after actionDef handlers)
 *
 * @param {Object} config - Hook creation configuration
 * @param {ActionDefs} config.actionDefs - Action definition collection
 * @param {Function} [config.useQueryClient] - React Query's useQueryClient hook (for query invalidation)
 * @returns {Function} useGenericAction hook
 */
const createUseGenericAction = (config) => {
  // ============================================================================
  // Configuration Resolution and Validation
  // ============================================================================

  // Resolve common configuration
  const resolvedConfig = resolveCreateActionHookConfig(config);

  // Extract useGenericAction-specific configuration
  const {
    useQueryClient, // Optional: for query invalidation support
  } = config;

  // ============================================================================
  // Return useGenericAction Hook
  // ============================================================================

  return (actionKey, options = {}) => {
    // ==========================================================================
    // Options Destructuring
    // ==========================================================================

    const {
      // Schema and form options
      schemaSelector = {},                  // Schema selector for dynamic schema
      initialForm,                          // Form initialization function (optional)
      customQueryClient,                    // Custom QueryClient instance (optional)

      // Runtime UI adapter overrides
      showAlert: overrideShowAlert,
      showConfirm: overrideShowConfirm,

      // Development options
      verbose,

      // Other options (passed to useActionCore)
      ...otherOptions
    } = options;

    // ==========================================================================
    // Preprocessing (External hooks, version calculation, action definition)
    // ==========================================================================

    const preprocessed = useActionPreprocessor(actionKey, resolvedConfig, {
      showAlert: overrideShowAlert, showConfirm: overrideShowConfirm, verbose,
    });

    // ==========================================================================
    // Extract execute from actionDef
    // ==========================================================================

    const customExecute = preprocessed.actionDef.execute;

    if (!_.isFunction(customExecute)) {
      throw new Error(`actionDef.execute must be a function for action: ${actionKey}`);
    }

    // ==========================================================================
    // Dynamic Schema and Form Management (using useDynamicSchemaForm hook)
    // ==========================================================================

    // Prepare schema source for useDynamicSchemaForm
    const schemaSource = React.useMemo(() => {
      return _.isFunction(preprocessed.actionDef.schema)
        ? preprocessed.actionDef.schema(schemaSelector)
        : preprocessed.actionDef.schema;
    }, [preprocessed.actionDef.schema, JSON.stringify(schemaSelector)]);

    // Use the centralized dynamic schema and form management hook
    const { currentSchema, form, formAssignedAt } = useDynamicSchemaForm(schemaSource, initialForm);


    // ==========================================================================
    // Query Client (optional, for query invalidation)
    // ==========================================================================

    // Get React Query client instance if useQueryClient is provided
    const queryClient = useQueryClient
      ? useQueryClient(customQueryClient)
      : null;

    // ==========================================================================
    // Handler References (to avoid circular dependency)
    // ==========================================================================

    // Use ref to store handlers that will be set after useActionCore is called
    const handlersRef = React.useRef({ onSuccess: null, onError: null });

    // ==========================================================================
    // Execution Resources Memoization
    // ==========================================================================

    const execution = React.useMemo(() => ({
      // Execute function that calls custom actionDef.execute
      // Supports executionOptions: onSuccess, onError
      // Execution order: 1) actionCore handlers → 2) executionOptions handlers
      execute: (executionParams, executionOptions) => {
        // Execute actionDef.execute and handle result
        // useActionCore calls this, and we handle the Promise result
        Promise.resolve(customExecute(executionParams))
          .then((result) => {
            // 1) Execute actionDef handlers
            if (handlersRef.current.onSuccess) {
              handlersRef.current.onSuccess(result);
            }
            // 2) Execute executionOptions handlers
            if (executionOptions?.onSuccess) {
              executionOptions.onSuccess(result);
            }
          })
          .catch((error) => {
            // 1) Execute actionDef handlers
            if (handlersRef.current.onError) {
              handlersRef.current.onError(error);
            }
            // 2) Execute executionOptions handlers
            if (executionOptions?.onError) {
              executionOptions.onError(error);
            }
          });
      },
      schema: currentSchema,
      form: form,
      queryClient
    }), [customExecute, currentSchema, form, queryClient]);

    // ==========================================================================
    // Call useActionCore and Connect Handlers
    // ==========================================================================

    const actionCoreResult = useActionCore(preprocessed, otherOptions, execution);
    // Connect the handlers (this happens before any execution)
    handlersRef.current.onSuccess = actionCoreResult.onSuccess;
    handlersRef.current.onError = actionCoreResult.onError;

    // ==========================================================================
    // Return Hook Result
    // ==========================================================================

    return {
      // Action execution (provided by useActionCore)
      start: actionCoreResult.start,      // Action execution function
      isValidatedForm: actionCoreResult.isValidatedForm, // Form validation status

      // Concurrency control state
      isRunning: actionCoreResult.isRunning,    // Overall flow is running
      isExecuting: actionCoreResult.isExecuting, // Actual action is executing

      // Form and schema (from useDynamicSchemaForm hook)
      form: form,                         // Form data (MobX observable)
      schema: currentSchema,              // Current schema (can change dynamically)
      formAssignedAt,                     // Form assignment timestamp (for observability)

      // Action definition
      actionDef: actionCoreResult.actionDef, // Action definition

      // External hooks result mapping
      mappedHooksResult: preprocessed.mappedHooksResult, // auth, translation, navigation, etc.
    };
  };
};

module.exports = createUseGenericAction;
