const React = require('react');
const _ = require('lodash');
const { toJS } = require('mobx');
const useConcurrencyControl = require('./use-concurrency-control');

/**
 * Core module providing common action execution logic
 * 
 * This module extracts shared logic used by both useAction and useCustomAction:
 * - Concurrency control (isRunning, isExecuting)
 * - Check execution logic
 * - confirmAction logic
 * - Success/error handling
 * - External hooks management
 */

/**
 * React hook providing common logic for action execution
 * 
 * @param {Object} preprocessed - Preprocessed result object
 * @param {string} preprocessed.actionKey - Action key (for logging and debugging)
 * @param {Object} preprocessed.actionDef - Action definition object
 * @param {Object} preprocessed.mappedHooksResult - Mapped hook results (auth, appContext, translation, navigation)
 * @param {*} preprocessed.authVersion - Auth version
 * @param {*} preprocessed.appContextVersion - App context version
 * @param {Function} preprocessed.showAlert - Alert display function
 * @param {Function} preprocessed.showConfirm - Confirm dialog display function
 * @param {Object} options - Action options
 * @param {Object} [options.gateContext] - Gate context (routeParams, queryParams, etc.)
 * @param {Function} [options.onBeforeExecute] - Hook before action execution
 * @param {Function} [options.onBeforeGoOnError] - Hook before error handling
 * @param {Function} [options.onBeforeGoOnSuccess] - Hook before success handling
 * @param {Object} execution - Execution resources/operations object
 * @param {Function} execution.execute - Actual action execution function (mutation or customAction)
 * @param {Object} [execution.schema] - Schema for form validation
 * @param {Object} [execution.form] - Form data
 * @param {QueryClient} [execution.queryClient] - React Query client (used only in useGateAction)
 * @returns {Object} Object providing action execution logic
 */
const useActionCore = (preprocessed, options, execution) => {
  // Destructure preprocessed
  const {
    actionKey,
    actionDef,
    mappedHooksResult,
    authVersion,
    appContextVersion,
    showAlert,
    showConfirm,
    verbose,
  } = preprocessed;

  // Destructure options
  const {
    gateContext,

    // User callbacks
    onBeforeExecute,
    onBeforeGoOnError,
    onBeforeGoOnSuccess
  } = options;

  // Destructure execution
  const {
    execute,
    schema,
    form,
    queryClient,
  } = execution;

  // Concurrency control state management
  const concurrencyControl = useConcurrencyControl();

  // ============================================================================
  // Utility Functions (Common/Helper)
  // ============================================================================

  // Function to create callback parameters
  const makeCallbackParams = React.useCallback((additionalParams = {}) => {
    // Form after schema validation should be read-only for data integrity
    // By default, pass as plain object to prevent modification
    // If you want to keep observability, you can override via additionalParams
    const base = { actionKey, ...mappedHooksResult };
    gateContext && (base.gateContext = gateContext);
    form && (base.form = toJS(form));
    return { ...base, ...additionalParams };
  }, [actionKey, mappedHooksResult, gateContext, form]);


  // Helper function to resolve actionDef fields
  const resolveDefField = React.useCallback((fieldName, resolveParams = {}) => {
    const fieldValue = actionDef[fieldName];
    if (_.isFunction(fieldValue)) {
      return fieldValue(resolveParams);
    }
    return fieldValue;
  }, [actionDef]);


  // Function to show confirm dialog with defField
  const showConfirmWithDefField = React.useCallback((defField, defaultOnConfirm, defaultOnCancel, additionalParams = {}) => {
    const {
      title,
      message,
      cancelText,
      confirmText,
      onConfirm: userOnConfirm,
      onCancel: userOnCancel,
      extra
    } = defField;

    // Combine user logic with default behavior
    // Intentionally not using try-catch: developer logic errors are bugs and should be immediately exposed
    const onConfirm = userOnConfirm ? async () => {
      await userOnConfirm(makeCallbackParams({ extra, ...additionalParams }));
      defaultOnConfirm();
    } : defaultOnConfirm;

    const onCancel = userOnCancel ? async () => {
      await userOnCancel(makeCallbackParams({ extra, ...additionalParams }));
      defaultOnCancel();
    } : defaultOnCancel;

    showConfirm(title, message, {
      cancelText, confirmText, onConfirm, onCancel, extra,
      ...makeCallbackParams(additionalParams)
    });
  }, [makeCallbackParams, showConfirm]);


  // Function to show alert with defField
  const showAlertWithDefField = React.useCallback((defField, defaultOnClose, additionalParams = {}) => {
    const {
      title,
      message,
      closeText,
      onClose: userOnClose,
      extra
    } = defField;

    // Combine user logic with default behavior
    // Intentionally not using try-catch: developer logic errors are bugs and should be immediately exposed
    const onClose = userOnClose ? async () => {
      await userOnClose(makeCallbackParams({ extra, ...additionalParams }));
      defaultOnClose();
    } : defaultOnClose;

    showAlert(title, message, {
      closeText, onClose, extra,
      ...makeCallbackParams(additionalParams)
    });
  }, [makeCallbackParams, showAlert]);


  /**
   * Unified alert error handling function for all action errors
   * 
   * @param {string} errorType - Type of error: 'execution', 'check', 'validation'
   * @param {Error} error - The error object
   * @param {string} defaultTitle - Default title for alert
   * @param {string} defaultMessage - Default message for alert
   * 
   * Error handling strategies:
   * - 'quiet': Stop silently without warning (useful for expected failures)
   * - Object: Show alert with resolved configuration from actionDef
   * - falsy: Console warn and stop (fallback when actionDef field is not provided)
   */
  const alertActionError = React.useCallback((errorType, error, defaultTitle, defaultMessage) => {
    const fieldName = (() => {
      if (errorType === 'execution') return 'alertError';
      if (errorType === 'check') return 'alertCheckError';
      if (errorType === 'validation') return 'alertValidationError';
      throw new Error(`Invalid errorType: ${errorType}`);
    })();

    const resolved = resolveDefField(fieldName, makeCallbackParams({ errorType, error }));

    // Object: Show alert with resolved configuration from actionDef
    // actionDef provides custom title, message, etc.
    if (resolved && typeof resolved === 'object') {
      const defaultOnClose = () => concurrencyControl.stopAll();
      const defFieldWithDefaults = { title: defaultTitle, message: defaultMessage, ...resolved };
      showAlertWithDefField(defFieldWithDefaults, defaultOnClose, { errorType, error });
      return;
    }

    // Default handling (no alert defined): 
    // If verbose is on, log the detailed error in the group. 
    // Use console.warn for transparency during development when no alert is provided.
    if (verbose) {
      console.warn(`[Bliss:Action:${actionKey}] ${errorType} failed, but no UI alert (actionDef.${fieldName}) was defined. Silent stop for user.`);
      console.error(error);
    }
    
    concurrencyControl.stopAll();
  }, [resolveDefField, makeCallbackParams, showAlertWithDefField, concurrencyControl.stopAll, actionKey, verbose]);


  // Form validation function
  const isValidatedForm = React.useCallback(() => {
    if (!schema) {
      throw new Error('No schema to validate form');
    }

    try {
      schema.validate(toJS(form));
      return true;
    } catch {
      return false;
    }
  }, [schema, form]);


  // ============================================================================
  // Core Execution Functions (Main Flow)
  // ============================================================================

  // confirmAction function
  // - Shows user confirmation dialog if actionDef.confirmAction is defined
  // - Executes action immediately if no confirmAction
  //
  // Overall flow:
  // 1. Check confirmAction definition → execute immediately if not defined
  // 2. Show confirmation dialog (title, message, button texts, etc.)
  // 3. Branch based on user selection:
  //    - Confirm: onBeforeExecute → execute → onSuccess/onError
  //    - Cancel: onCancel (default: isRunning = false)
  const confirmAction = React.useCallback((executionParams = {}, executionOptions = {}) => {
    const invokeExecution = () => {
      if (concurrencyControl.checkAndStartExecuting()) {
        // User Callback: before action execution
        try {
          onBeforeExecute && onBeforeExecute(makeCallbackParams());
        } catch (callbackError) {
          if (verbose) console.warn(`[Bliss:Action:${actionKey}] onBeforeExecute error:`, callbackError);
          throw callbackError;
        }

        // Execute actual action based on execution strategy (mutation or customAction)
        if (verbose) {
          console.groupCollapsed(`%c[Bliss:Action:${actionKey}] %cEXECUTE_ACTUAL`, 'color: #2196F3; font-weight: bold', 'color: inherit');
          console.log('Execution Params:', executionParams);
          console.log('Execution Options:', executionOptions);
          console.groupEnd();
        }
        execute(executionParams, executionOptions);
      } else {
        if (verbose) console.warn(`[Bliss:Action:${actionKey}] action already running...; new action request ignored`);
      }
    };

    // Define default behavior
    const defaultOnCancel = () => concurrencyControl.stopAll();

    // confirmAction logic
    const confirmActionDefField = resolveDefField('confirmAction', makeCallbackParams());

    if (confirmActionDefField) {
      showConfirmWithDefField(confirmActionDefField, invokeExecution, defaultOnCancel);
    } else {
      invokeExecution();
    }
  }, [makeCallbackParams, showConfirm, showConfirmWithDefField, onBeforeExecute, execute, actionDef, concurrencyControl.checkAndStartExecuting, concurrencyControl.stopAll]);


  // start function (entry point for action execution)
  // - Complete action execution flow including form validation, business logic check, confirmation dialog, concurrency control
  //
  // Overall flow:
  // 1. Concurrency control: ignore if already running
  // 2. Form validation: validate form data if schema exists
  // 3. Business logic check: execute actionDef.check (supports both sync/async)
  // 4. Handle check result:
  //    - Success: call confirmAction (confirmation dialog or immediate execution)
  //    - Failure: show error with showCheckError
  const start = React.useCallback((startOptions = {}) => {
    // Prevent duplicate button clicks
    if (!concurrencyControl.checkAndStartRunning()) {
      if (verbose) console.warn(`[Bliss:Action:${actionKey}] start already executing...; new start request ignored`);
      return;
    }

    if (verbose) {
      console.groupCollapsed(`%c[Bliss:Action:${actionKey}] %cSTART`, 'color: #4CAF50; font-weight: bold', 'color: inherit');
      console.log('Start Options:', startOptions);
      console.log('Context:', makeCallbackParams());
      console.groupEnd();
    }

    try {
      const {
        checkParams = {},
        executionParams: startExecutionParams = {},
        executionOptions = {},
        onCheckError,
        onValidationError
      } = startOptions;

      // Extract form, schema, and other execution parameters from startExecutionParams
      const {
        form: startParamsForm,
        schema: startParamsSchema,
        ...otherExecutionParams
      } = startExecutionParams;

      // Create executionParams with form and schema (prioritize startOptions over hook state)
      const executionParams = { ...otherExecutionParams };
      // Add form and schema if available (prioritize startOptions over hook state)
      (startParamsForm || form) && (executionParams.form = toJS(startParamsForm || form));
      (startParamsSchema || schema) && (executionParams.schema = startParamsSchema || schema);

      // Validation error handling helper function
      const showValidationError = (error) => {
        alertActionError('validation', error, 'Validation Error', _.get(error, 'message', 'Form validation failed'));
        onValidationError && onValidationError(error);
      };

      // Check error handling helper function
      const showCheckError = (error) => {
        alertActionError('check', error, _.get(error, 'title', 'Error'), _.get(error, 'message', 'Check failed'));
        onCheckError && onCheckError(error);
      };


      // 1. Form validation (using schema provided by execution)
      if (executionParams.schema) {
        try {
          if (verbose) {
            console.groupCollapsed(`%c[Bliss:Action:${actionKey}] %cVALIDATION_START`, 'color: #FF9800; font-weight: bold', 'color: inherit');
            console.log('Form data:', executionParams.form);
            console.groupEnd();
          }
          executionParams.schema.validate(executionParams.form);
          if (verbose) console.log(`%c[Bliss:Action:${actionKey}] %cVALIDATION_OK`, 'color: #4CAF50; font-weight: bold', 'color: inherit');
        } catch (validationError) {
          showValidationError(validationError);
          return;
        }
      }

      // Check handling scenarios:
      // - case A) No actionDef.check: immediately execute confirmAction
      // - case B) Sync check success: checkResult === undefined (or value) → execute confirmAction in then
      // - case C) Sync check failure: throw inside check() → collect in catchError → execute showCheckError
      // - case D) Async check success: checkResult === Promise resolve → execute confirmAction in then
      // - case E) Async check failure: checkResult === Promise reject → execute showCheckError in catch
      let checkResult = null;
      let checkError = null;

      // 2. Execute check (business logic check with validated form)
      if (actionDef.check) {
        try {
          if (verbose) {
            console.groupCollapsed(`%c[Bliss:Action:${actionKey}] %cCHECK_START`, 'color: #FF9800; font-weight: bold', 'color: inherit');
            console.log('Check Parameters:', checkParams);
            console.groupEnd();
          }
          checkResult = actionDef.check(
            makeCallbackParams({ ...checkParams })
          );
        } catch (err) {
          // Developer may accidentally throw falsy values (undefined, false, null, etc.)
          // Without || fallback, falsy errors would be treated as successful check result
          checkError = err || new Error('Unknown error from check');
        }
      }


      // 3. Unified handling: prioritize error handling, otherwise handle check result (sync/async) then confirmAction
      if (checkError) {
        showCheckError(checkError);
      } else {
        Promise.resolve(checkResult)
          .then(() => confirmAction(executionParams, executionOptions))
          .catch((asyncCheckError) => showCheckError(asyncCheckError));
      }

      // start function ends here
      // Subsequent flow is handled by confirmAction, showCheckError, etc.
      return;

    } catch (error) {
      // Concurrency control scenario 2: error in run() (before action)
      concurrencyControl.stopAll();

      // Unexpected errors in start process are thrown as is
      console.error('Unexpected error in start process:', error);
      throw error;
    }
  }, [actionKey, schema, form, makeCallbackParams, confirmAction, alertActionError, concurrencyControl.checkAndStartRunning, concurrencyControl.stopAll]);


  // ============================================================================
  // Result Handling Functions (Success/Failure Handlers)
  // ============================================================================

  // Success handler
  const onSuccess = React.useCallback((data) => {
    if (verbose) {
      console.groupCollapsed(`%c[Bliss:Action:${actionKey}] %cSUCCESS`, 'color: #4CAF50; font-weight: bold', 'color: inherit');
      console.log('Response data:', data);
      console.groupEnd();
    }

    // Success alert
    const alertSuccessDefField = resolveDefField('alertSuccess', makeCallbackParams({ data }));
    if (alertSuccessDefField) {
      showAlertWithDefField(alertSuccessDefField, () => { }, { data });
    }

    // Invalidate queries (using queryClient provided by execution)
    const invalidateQueriesOnSuccessDefField = resolveDefField('invalidateQueriesOnSuccess', makeCallbackParams({ queryClient, data }));

    if (invalidateQueriesOnSuccessDefField && queryClient) {
      const { options = {}, ...filters } = invalidateQueriesOnSuccessDefField;
      queryClient.invalidateQueries(filters, options);
    }

    // User Callback: before success handling
    try {
      onBeforeGoOnSuccess && onBeforeGoOnSuccess(makeCallbackParams({ data }));
    } catch (callbackError) {
      if (verbose) console.warn(`[Bliss:Action:${actionKey}] onBeforeGoOnSuccess error:`, callbackError);
      throw callbackError;
    }

    // Post-success handling
    const goOnSuccessDefField = resolveDefField('goOnSuccess', makeCallbackParams({ data }));

    if (goOnSuccessDefField) {
      if (goOnSuccessDefField === 'back') {
        mappedHooksResult.navigation.goBack();
      } else if (_.isFunction(goOnSuccessDefField)) {
        goOnSuccessDefField();
      }
    }

    // Concurrency control scenario 1: normal completion
    concurrencyControl.stopAll();
  }, [makeCallbackParams, showAlertWithDefField, actionDef, queryClient, onBeforeGoOnSuccess, concurrencyControl.stopAll]);

  // Error handler
  const onError = React.useCallback((error) => {
    if (verbose) {
      console.groupCollapsed(`%c[Bliss:Action:${actionKey}] %cERROR`, 'color: #F44336; font-weight: bold', 'color: inherit');
      console.error('Error detail:', error);
      console.groupEnd();
    }

    // Error alert using unified error handling
    alertActionError('execution', error, 'Error', 'Execution failed');

    // User Callback: before error handling
    try {
      onBeforeGoOnError && onBeforeGoOnError(makeCallbackParams({ error }));
    } catch (callbackError) {
      if (verbose) console.warn(`[Bliss:Action:${actionKey}] onBeforeGoOnError error:`, callbackError);
      throw callbackError;
    }

    // Post-error handling
    const goOnErrorDefField = resolveDefField('goOnError', makeCallbackParams({ error }));

    if (goOnErrorDefField) {
      if (goOnErrorDefField === 'back') {
        mappedHooksResult.navigation.goBack();
      } else if (_.isFunction(goOnErrorDefField)) {
        goOnErrorDefField();
      }
    }

    // Concurrency control scenario 3: error in action
    concurrencyControl.stopAll();
  }, [makeCallbackParams, alertActionError, onBeforeGoOnError, mappedHooksResult.navigation, resolveDefField, concurrencyControl.stopAll]);

  return {
    // Action execution
    start,
    isValidatedForm,

    // Success/error handlers
    onSuccess,
    onError,

    // UI state (concurrency control)
    isRunning: concurrencyControl.uiState.isRunning,
    isExecuting: concurrencyControl.uiState.isExecuting,

    // Action definition
    actionDef,

    // gateContext (memoized)
    gateContext,

    // Form and schema (provided by execution)
    form: form,
    schema: schema,
  };
};

module.exports = useActionCore;
