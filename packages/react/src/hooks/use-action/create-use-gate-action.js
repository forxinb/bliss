const React = require('react');
const _ = require('lodash');
const useGate = require('../use-gate');
const useActionCore = require('./use-action-core');
const useActionPreprocessor = require('./use-action-preprocessor');
const resolveCreateActionHookConfig = require('./resolve-create-action-hook-config');

/**
 * Factory function to create useAction hook
 *
 * Creates a hook that executes server actions using React Query's useMutation.
 * Provides form validation and schema management through useGate, and action execution logic through useActionCore.
 *
 * @typedef {Object} GateDef
 * @property {string} path - API path (e.g., '/users/:userId')
 * @property {string} method - HTTP method ('POST' | 'PUT' | 'DELETE' | 'GET')
 * @property {Object} [schema] - Form validation schema (Simpl-Schema, etc.)
 * @property {string} [formPath] - Form data path
 * @property {Object} [errorDef] - Error handling definition
 * @property {Object} [successDef] - Success handling definition
 *
 * @typedef {Object} ActionDef
 * @property {{ path: string, method: string }} gating - Gate lookup spec (required)
 * @property {Object|Function} [confirmAction] - Confirmation dialog definition
 * @property {Object|Function} [alertSuccess] - Success alert definition
 * @property {Object|Function} [alertError] - Error alert definition
 * @property {Function} [goOnSuccess] - Callback after success: ({ data, navigation, ... }) => void
 * @property {Function} [goOnError] - Callback after error: ({ error, navigation, ... }) => void
 * @property {Object|Function} [invalidateQueriesOnSuccess] - Query invalidation on success
 *
 * @typedef {Object.<string, ActionDef>} ActionDefs
 *
 * @typedef {Object} ActionOptions
 * @property {Function} [makeGateContext] - ({ auth, appContext, translation, navigation }) => gateContext
 * @property {Array}    [makeGateContextDeps] - Dependency array for makeGateContext regeneration
 * @property {Array}    [createMutationFnDeps] - Dependency array for mutationFn regeneration
 * @property {Object}   [useMutationOptions] - React Query useMutation options (merged at call time)
 * @property {*}        [customQueryClient] - Client instance to pass to useQueryClient (v5)
 * @property {Function} [onBeforeExecute] - Hook before action execution ({ ...mappedHooksResult, gateContext, actionKey, form })
 * @property {Function} [onBeforeGoOnError] - Hook before error handling ({ ...mappedHooksResult, error, form })
 * @property {Function} [onBeforeGoOnSuccess] - Hook before success handling ({ ...mappedHooksResult, data, form })
 * @property {Function} [showAlert] - Per-call UI adapter override (title, message?, options?) => void
 * @property {Function} [showConfirm] - Per-call UI adapter override (title, message?, options?) => void
 * @property {Object}   [executionOptions] - Runtime execution options for start() calls
 * @property {Function} [executionOptions.onSuccess] - Success callback (executes after actionDef handlers)
 * @property {Function} [executionOptions.onError] - Error callback (executes after actionDef handlers)
 *
 * @param {Object} config - Hook creation configuration
 * @param {Object} config.gateDefs - Gate definition catalog: { [path]: { [method]: GateDef } }
 * @param {ActionDefs} config.actionDefs - Action definition collection
 * @param {Function} config.createMutationFn - Mutation function creation function
 * @param {Function} config.useMutation - React Query's useMutation hook
 * @param {Function} config.useQueryClient - React Query's useQueryClient hook
 * @param {Object} [config.useMutationOptions={}] - Default useMutation options
 * @returns {Function} useGateAction hook
 */
const createUseGateAction = (config) => {
  // ============================================================================
  // Configuration Resolution and Validation
  // ============================================================================

  // Resolve common configuration
  const resolvedConfig = resolveCreateActionHookConfig(config);

  // Extract useAction-specific configuration
  const {
    gateDefs,
    createMutationFn,
    useMutation,
    useMutationOptions: defaultUseMutationOptions = {},
    useQueryClient
  } = config;

  // Validate required configuration
  if (!_.isPlainObject(gateDefs)) {
    throw new Error('gateDefs must be an object');
  }
  if (!createMutationFn) {
    throw new Error('createMutationFn is required');
  }
  if (!useMutation) {
    throw new Error('useMutation is required');
  }
  if (!useQueryClient) {
    throw new Error('useQueryClient is required');
  }

  // ============================================================================
  // Return useAction Hook
  // ============================================================================

  return (actionKey, options = {}) => {
    // ==========================================================================
    // Options Destructuring
    // ==========================================================================

    const {
      // useAction-specific options
      makeGateContext = () => ({}),
      makeGateContextDeps = [],
      createMutationFnDeps = [],
      useMutationOptions = {},
      customQueryClient,

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
    // Gate Context and Definition
    // ==========================================================================

    // Create gateContext (function-only support)
    const gateContext = React.useMemo(() => {
      return makeGateContext({ ...preprocessed.mappedHooksResult });
    }, [preprocessed.mappedHooksResult, ...makeGateContextDeps]);

    // Extract gate definition from action definition
    const gateDef = React.useMemo(() => {
      const { path, method } = _.get(preprocessed.actionDef, 'gating', {});
      if (!_.isString(path) || !_.isString(method)) {
        throw new Error(`Action '${actionKey}' must have gating { path, method } as strings`);
      }
      const _gateDef = _.get(gateDefs, `${path}.${method}`);
      if (!_gateDef) {
        throw new Error(`Gate not found: ${method} ${path}`);
      }
      return _gateDef;
    }, [preprocessed.actionDef.gating]);

    // Extract gate information using useGate (form, schema, URL, etc.)
    const gate = useGate(gateDef, gateContext);

    // ==========================================================================
    // React Query Setup
    // ==========================================================================

    // Get React Query client instance
    const queryClient = useQueryClient(customQueryClient);

    // Create mutation function (server API call function)
    const mutationFn = React.useMemo(() => {
      const fn = createMutationFn(actionKey, {
        ...preprocessed.mappedHooksResult, gate, queryClient,
      });
      if (!_.isFunction(fn)) {
        throw new Error('createMutationFn must return a function');
      }
      return fn;
    }, [
      preprocessed.mappedHooksResult, gate, queryClient,
      ...createMutationFnDeps
    ]);

    // ==========================================================================
    // Handler References (to avoid circular dependency)
    // ==========================================================================

    // useMutation needs onSuccess/onError, but they are created inside useActionCore
    // Solution: Use ref to store handlers that will be set after useActionCore is called
    const handlersRef = React.useRef({ onSuccess: null, onError: null });

    // Use React Query mutation hook with ref-based handlers
    const mutationHookResult = useMutation({
      ...defaultUseMutationOptions,
      ...useMutationOptions,
      mutationFn,
      onSuccess: (data) => {
        // Handler will be set by the time this executes
        if (handlersRef.current.onSuccess) {
          handlersRef.current.onSuccess(data);
        }
      },
      onError: (error) => {
        // Handler will be set by the time this executes
        if (handlersRef.current.onError) {
          handlersRef.current.onError(error);
        }
      }
    }, queryClient);
    const mutate = mutationHookResult.mutate;

    // ==========================================================================
    // Execution Resources Memoization
    // ==========================================================================

    const execution = React.useMemo(() => ({
      // Execute function that calls React Query mutation
      // Supports TanStack Query mutation options: onSuccess, onError, onSettled
      // Execution order: 1) useMutation settings → 2) mutate options (executionOptions)
      execute: (executionParams, executionOptions) => {
        mutate(executionParams, executionOptions);
      },
      schema: gate.schema,
      form: gate.form,
      queryClient
    }), [mutate, queryClient, gate]);

    // ==========================================================================
    // Call useActionCore and Connect Handlers
    // ==========================================================================

    const actionCoreResult = useActionCore(preprocessed, { gateContext, ...otherOptions, }, execution);
    // Connect the handlers (this happens before any execution)
    handlersRef.current.onSuccess = actionCoreResult.onSuccess;
    handlersRef.current.onError = actionCoreResult.onError;

    // ==========================================================================
    // Return Hook Result
    // ==========================================================================

    return {
      // useGate results (form, schema, gate information)
      // Frequently used properties are returned individually for convenience
      form: gate.form,                    // MobX observable form data
      formAssignedAt: gate.formAssignedAt, // Form assignment timestamp
      schema: gate.schema,                // Form validation schema
      gate,                               // Complete gate object (gateDef, urlSuffix, queryKey, etc.)

      // Note: form, formAssignedAt, schema are duplicated from gate object,
      // but returned individually for convenience of frequently used properties

      // Action execution (provided by useActionCore)
      start: actionCoreResult.start,      // Action execution function
      isValidatedForm: actionCoreResult.isValidatedForm, // Form validation status

      // Concurrency control state
      isRunning: actionCoreResult.isRunning,    // Overall flow is running
      isExecuting: actionCoreResult.isExecuting, // Actual action is executing

      // React Query mutation result
      mutationHookResult,                 // useMutation hook result (isLoading, error, data, etc.)

      // External hooks result mapping
      mappedHooksResult: preprocessed.mappedHooksResult, // auth, translation, navigation, etc.
    };
  };
};

module.exports = createUseGateAction;
