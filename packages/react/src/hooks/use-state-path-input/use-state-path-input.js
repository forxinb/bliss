const React = require('react');
const _ = require('lodash');
const { sap } = require('../../utils');

const DEFAULT_GET_VALUE_TO_SET = (e) => _.get(e, 'target.value', undefined);


/**
 * useStatePathInput Hook
 * 
 * Binds a state object and a path to an input value, handling debouncing and MobX actions.
 * Perfect for connecting form fields to a global or local state at a specific path.
 * 
 * @param {Object} params - Hook parameters
 * @param {Object|Function} params.state - State object or function returning state
 * @param {string|Function} params.path - Path in state or function returning path
 * @param {Function} params.getValueToSet - Function to extract value from event (default: e.target.value)
 * @param {number} params.debounce - Debounce time in ms (-1 to disable)
 * @param {Function} params.onChangeStateAtPath - Callback after state is updated
 * @returns {Object} { value, onChangeValue }
 */
const useStatePathInput = (params = {}) => {
  const {
    state = {},
    path = '',
    getValueToSet = DEFAULT_GET_VALUE_TO_SET,
    debounce = -1,
    onChangeStateAtPath,
  } = params;

  // 1. Evaluate state and path (supports late evaluation)
  const _state = _.isFunction(state) ? state() : state;
  const _path = _.isFunction(path) ? path() : path;

  // 2. Get current value from path
  const currentValue = _.get(_state, _path);

  // 3. Keep track of the last value to sync with debounced updates
  const lastTargetValueRef = React.useRef(undefined);

  // 4. Update core logic (using sap utility for MobX awareness)
  const executeUpdate = React.useCallback((...args) => {
    const newValue = lastTargetValueRef.current;

    // sap utility handles MobX action and observability
    sap(_state, _path, newValue);

    if (_.isFunction(onChangeStateAtPath)) {
      onChangeStateAtPath(_state, _path, ...args);
    }
  }, [_state, _path, onChangeStateAtPath]);

  // 5. Stable debounce function
  const debouncedUpdate = React.useMemo(() => {
    if (debounce >= 0) {
      return _.debounce((...args) => executeUpdate(...args), debounce);
    }
    return null;
  }, [executeUpdate, debounce]);

  // 6. Clean up pending debounce on unmount or when debouncedUpdate changes
  React.useEffect(() => {
    return () => {
      if (debouncedUpdate && debouncedUpdate.cancel) {
        debouncedUpdate.cancel();
      }
    };
  }, [debouncedUpdate]);

  // 7. Main handler for input change events
  const onChangeValue = React.useCallback((...args) => {
    const newValue = getValueToSet(...args);
    lastTargetValueRef.current = newValue;

    // React Synthetic Event persistency for async updates
    _.each(args, (arg) => {
      if (arg && typeof arg.persist === 'function') {
        arg.persist();
      }
    });

    if (debouncedUpdate) {
      debouncedUpdate(...args);
    } else {
      executeUpdate(...args);
    }
  }, [getValueToSet, debouncedUpdate, executeUpdate]);

  return {
    value: currentValue,
    onChangeValue: onChangeValue,
  };
};

module.exports = useStatePathInput;
