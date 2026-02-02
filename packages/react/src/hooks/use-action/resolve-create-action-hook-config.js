const _ = require('lodash');

// ============================================================================
// Mock Functions and Default Values
// ============================================================================

// Mock UI functions (prevent errors with default values, avoid creating new references each time)
const MOCK_SHOW_ALERT = (title, message, options = {}) => {
  console.warn('showAlert called:', { title, message, options });
};

const MOCK_SHOW_CONFIRM = (title, message, options = {}) => {
  console.warn('showConfirm called:', { title, message, options });
};

// Default object that all mock hooks will return
const MOCK_HOOK_RESULT = {}

// Mock hooks - used as default values
const MOCK_TRANSLATION_HOOK = () => MOCK_HOOK_RESULT;
const MOCK_NAVIGATION_HOOK = () => MOCK_HOOK_RESULT;
const MOCK_AUTH_HOOK = () => MOCK_HOOK_RESULT;
const MOCK_APP_CONTEXT_HOOK = () => MOCK_HOOK_RESULT;

// Default version selector - returns hook result as is
const MOCK_HOOK_RESULT_VERSION_SELECTOR = (hookResult) => hookResult;

// Default hook result mapping function - returns only basic hook results
const DEFAULT_MAP_HOOKS_RESULT = (hooksResult) => ({
  auth: hooksResult.auth,
  appContext: hooksResult.appContext,
  translation: hooksResult.translation,
  navigation: hooksResult.navigation,
});


/**
 * Utility function to resolve action hook creation configuration
 * 
 * Extracts and deduplicates long configuration destructuring used commonly
 * in createUseGateAction and createUseGenericAction.
 * Provides default values for all configurations and performs validation.
 * 
 * @param {Object} config - Original configuration object
 * @param {Object} config.actionDefs - Action definition collection (key: action key, value: ActionDef)
 * @param {Function} [config.showAlert] - Alert display function (externally injected)
 * @param {Function} [config.showConfirm] - Confirmation dialog display function (externally injected)
 * @param {Function} [config.authHook] - Authentication hook (externally injected)
 * @param {Array} [config.authHookArguments] - Auth hook argument array (passed via spread)
 * @param {Function} [config.authVersionSelector] - Auth version selector function
 *   - Returns: Version identifier (string, number, object, etc.)
 *   - Purpose: Used as memoization dependency
 * @param {Function} [config.appContextHook] - App context hook (externally injected)
 * @param {Array} [config.appContextHookArguments] - App context hook argument array (passed via spread)
 * @param {Function} [config.appContextVersionSelector] - App context version selector function
 *   - Returns: Version identifier (string, number, object, etc.)
 *   - Purpose: Used as memoization dependency
 * @param {Function} [config.translationHook] - Translation hook (externally injected)
 * @param {Array} [config.translationHookArguments] - Translation hook argument array (passed via spread)
 * @param {Function} [config.translationVersionSelector] - Translation version selector function
 *   - Returns: Version identifier (string, number, object, etc.)
 *   - Purpose: Used as memoization dependency
 * @param {Function} [config.navigationHook] - Navigation hook (externally injected)
 * @param {Array} [config.navigationHookArguments] - Navigation hook argument array (passed via spread)
 * @param {Function} [config.navigationVersionSelector] - Navigation version selector function
 *   - Returns: Version identifier (string, number, object, etc.)
 *   - Purpose: Used as memoization dependency
 * @param {Function} [config.mapHooksResult] - Hook result mapping function
 *   - Returns: Hook result object to pass to callbacks
 *   - Purpose: Transform hook results into format used by callbacks
 * @returns {Object} Resolved configuration object
 */
const resolveCreateActionHookConfig = (config) => {
  // ==========================================================================
  // Configuration Destructuring with Defaults
  // ==========================================================================

  const {
    // Action definitions
    actionDefs,

    // UI functions
    showAlert = MOCK_SHOW_ALERT,
    showConfirm = MOCK_SHOW_CONFIRM,

    // Authentication related
    authHook = MOCK_AUTH_HOOK,
    authHookArguments = [],
    authVersionSelector = MOCK_HOOK_RESULT_VERSION_SELECTOR,

    // App context related
    appContextHook = MOCK_APP_CONTEXT_HOOK,
    appContextHookArguments = [],
    appContextVersionSelector = MOCK_HOOK_RESULT_VERSION_SELECTOR,

    // Translation related
    translationHook = MOCK_TRANSLATION_HOOK,
    translationHookArguments = [],
    translationVersionSelector = MOCK_HOOK_RESULT_VERSION_SELECTOR,

    // Navigation related
    navigationHook = MOCK_NAVIGATION_HOOK,
    navigationHookArguments = [],
    navigationVersionSelector = MOCK_HOOK_RESULT_VERSION_SELECTOR,

    // Hook result mapping
    mapHooksResult = DEFAULT_MAP_HOOKS_RESULT,

  } = config;

  // ==========================================================================
  // Configuration Validation
  // ==========================================================================

  if (!_.isPlainObject(actionDefs)) {
    throw new Error('actionDefs must be an object');
  }

  // ==========================================================================
  // Return Resolved Configuration
  // ==========================================================================

  return {
    // Action definitions
    actionDefs,

    // UI functions
    showAlert,
    showConfirm,

    // Authentication related
    authHook,
    authHookArguments,
    authVersionSelector,

    // App context related
    appContextHook,
    appContextHookArguments,
    appContextVersionSelector,

    // Navigation related
    navigationHook,
    navigationHookArguments,
    navigationVersionSelector,

    // Translation related
    translationHook,
    translationHookArguments,
    translationVersionSelector,

    // Hook result mapping
    mapHooksResult,

  };
};

module.exports = resolveCreateActionHookConfig;
