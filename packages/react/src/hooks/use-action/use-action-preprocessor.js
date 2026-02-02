const React = require('react');
const _ = require('lodash');
const { safeSpreadArguments } = require('@godbliss/core/utils');

/**
 * React hook providing common preprocessing logic for action execution
 * 
 * This hook combines information from two sources to provide consistent preprocessing
 * output required for useAction/useCustomAction execution:
 * - Source A: Resolved configuration (resolvedConfig) from factory stage
 *   (createUseGateAction/createUseGenericAction)
 * - Source B: Action options (actionOptions) passed at hook call time (per-call overrides)
 * 
 * Key Responsibilities:
 * 1) External hook invocation: Safely call auth/appContext/translation/navigation hooks
 * 2) Version calculation: Apply version selectors to each hook result for memoization criteria
 * 3) Action definition extraction: Find and validate action definition from actionDefs using actionKey
 * 4) Hook result mapping: Structure common arguments to pass to callbacks/UI via mapHooksResult
 * 5) UI adapter resolution: Prioritize actionOptions' showAlert/showConfirm, fallback to resolvedConfig defaults
 * 6) Meta information return: Include actionKey, actionDef, etc. needed in subsequent stages
 * 
 * @param {string} actionKey - Action key (e.g., 'user.create')
 * @param {Object} resolvedConfig - Resolved configuration object
 * @param {Object} [actionOptions={}] - Action options bucket (for future expansion)
 * @param {Object} [actionOptions.gateContext] - Gate context
 * @param {Function} [actionOptions.onBeforeExecute] - Hook before action execution
 * @param {Function} [actionOptions.onBeforeGoOnError] - Hook before error handling
 * @param {Function} [actionOptions.onBeforeGoOnSuccess] - Hook before success handling
 * @param {Object} resolvedConfig.actionDefs - Action definition collection
 * @param {Function} resolvedConfig.authHook - Authentication hook
 * @param {Array} resolvedConfig.authHookArguments - Auth hook argument array
 * @param {Function} resolvedConfig.authVersionSelector - Auth version selector
 * @param {Function} resolvedConfig.appContextHook - App context hook
 * @param {Array} resolvedConfig.appContextHookArguments - App context hook argument array
 * @param {Function} resolvedConfig.appContextVersionSelector - App context version selector
 * @param {Function} resolvedConfig.translationHook - Translation hook
 * @param {Array} resolvedConfig.translationHookArguments - Translation hook argument array
 * @param {Function} resolvedConfig.translationVersionSelector - Translation version selector
 * @param {Function} resolvedConfig.navigationHook - Navigation hook
 * @param {Array} resolvedConfig.navigationHookArguments - Navigation hook argument array
 * @param {Function} resolvedConfig.navigationVersionSelector - Navigation version selector
 * @param {Function} resolvedConfig.mapHooksResult - Hook result mapping function
 * @returns {Object} Preprocessed results
 * @returns {string} returns.actionKey - Action key
 * @returns {Object} returns.actionDef - Action definition
 * @returns {Object} returns.auth - Auth hook result
 * @returns {Object} returns.appContext - App context hook result
 * @returns {Object} returns.translation - Translation hook result
 * @returns {Object} returns.navigation - Navigation hook result
 * @returns {*} returns.authVersion - Auth version
 * @returns {*} returns.appContextVersion - App context version
 * @returns {*} returns.translationVersion - Translation version
 * @returns {*} returns.navigationVersion - Navigation version
 * @returns {Object} returns.mappedHooksResult - Mapped hook results
 * @returns {Function} returns.showAlert - Resolved alert function
 * @returns {Function} returns.showConfirm - Resolved confirm function
 */
const useActionPreprocessor = (actionKey, resolvedConfig, actionOptions = {}) => {
  // ==========================================================================
  // Configuration Destructuring
  // ==========================================================================

  const {
    actionDefs,
    authHook,
    authHookArguments,
    authVersionSelector,
    appContextHook,
    appContextHookArguments,
    appContextVersionSelector,
    translationHook,
    translationHookArguments,
    translationVersionSelector,
    navigationHook,
    navigationHookArguments,
    navigationVersionSelector,
    mapHooksResult,
    // UI adapters (fallback values)
    showAlert: fallbackShowAlert,
    showConfirm: fallbackShowConfirm,
  } = resolvedConfig;

  // ==========================================================================
  // External Hooks Invocation
  // ==========================================================================

  // Safely call external hooks (pass arguments via safeSpreadArguments)
  const auth = authHook(...safeSpreadArguments(authHookArguments, 'Auth'));
  const appContext = appContextHook(...safeSpreadArguments(appContextHookArguments, 'AppContext'));
  const translation = translationHook(...safeSpreadArguments(translationHookArguments, 'Translation'));
  const navigation = navigationHook(...safeSpreadArguments(navigationHookArguments, 'Navigation'));

  // ==========================================================================
  // Version Calculation (for memoization dependencies)
  // ==========================================================================

  const authVersion = authVersionSelector(auth);
  const appContextVersion = appContextVersionSelector(appContext);
  const translationVersion = translationVersionSelector(translation);
  const navigationVersion = navigationVersionSelector(navigation);

  // ==========================================================================
  // Action Definition Extraction and Validation
  // ==========================================================================

  const actionDef = React.useMemo(() => {
    const _actionDef = _.get(actionDefs, `${actionKey}`);
    if (_.isEmpty(_actionDef) || !_.isPlainObject(_actionDef)) {
      throw new Error(`Action definition not found or invalid for key: ${actionKey}`);
    }
    return _actionDef;
  }, [actionKey]);

  // ==========================================================================
  // Hook Result Mapping (transform to developer-defined format)
  // ==========================================================================

  const mappedHooksResult = React.useMemo(() =>
    mapHooksResult({ auth, appContext, translation, navigation }) || {}
    , [authVersion, appContextVersion, translationVersion, navigationVersion]);

  // ==========================================================================
  // UI Adapter Resolution (actionOptions takes priority, fallback to resolvedConfig defaults)
  // ==========================================================================

  const showAlert = actionOptions.showAlert || fallbackShowAlert;
  const showConfirm = actionOptions.showConfirm || fallbackShowConfirm;

  // ==========================================================================
  // Return Preprocessed Results
  // ==========================================================================

  return {
    // Action definition
    actionKey,
    actionDef,

    // External hook results
    auth,
    appContext,
    translation,
    navigation,

    // Versions (for memoization dependencies)
    authVersion,
    appContextVersion,
    translationVersion,
    navigationVersion,

    // Mapped hook result (format to pass to callbacks)
    mappedHooksResult,

    // UI adapters (resolved values)
    showAlert,
    showConfirm,
  };
};

module.exports = useActionPreprocessor;
