const React = require('react');

/**
 * Custom hook for concurrency control
 *
 * Provides safe concurrency control by synchronizing UI state and internal logic state.
 * Uses hybrid approach: useState for UI rendering and useRef for synchronous internal checks.
 *
 * @returns {Object} Concurrency control functions and states
 * @returns {Object.uiState} UI state for rendering
 * @returns {boolean} uiState.isRunning - Whether the overall flow is running
 * @returns {boolean} uiState.isExecuting - Whether the actual action is executing
 * @returns {Function} checkAndStartRunning - Check and start the overall flow
 * @returns {Function} checkAndStartExecuting - Check and start the actual execution
 * @returns {Function} stopAll - Stop all states
 */
const useConcurrencyControl = () => {
  // ============================================================================
  // State Management (Hybrid Approach)
  // ============================================================================

  // UI state (triggers re-rendering)
  const [isRunning, setIsRunning] = React.useState(false);
  const [isExecuting, setIsExecuting] = React.useState(false);

  // Internal logic ref (synchronous access)
  const holder = React.useRef({
    isRunning: false,
    isExecuting: false
  }).current;

  // ============================================================================
  // Business Logic Functions
  // ============================================================================

  // Atomic operations: Check and state update must be combined to prevent race conditions
  // If we separate canStart() and startRunning(), there's a gap where another call
  // could pass the check before the first call updates the state, causing duplicate execution
  // Therefore, we use atomic operations that perform both check and update in one call

  const checkAndStartRunning = React.useCallback(() => {
    const canStart = !holder.isRunning;
    if (!canStart) {
      console.warn('Cannot start, ignoring start request: already running');
      return false;
    }
    holder.isRunning = true;  // Update ref first (synchronous)
    setIsRunning(true);       // Then update UI state (asynchronous)
    return true;
  }, []);

  const checkAndStartExecuting = React.useCallback(() => {
    const canExecute = holder.isRunning && !holder.isExecuting;
    if (!canExecute) {
      console.warn('Cannot execute, ignoring execution request: not running or already executing');
      return false;
    }
    holder.isExecuting = true;  // Update ref first (synchronous)
    setIsExecuting(true);      // Then update UI state (asynchronous)
    return true;
  }, []);

  const stopAll = React.useCallback(() => {
    // Update ref first (synchronous) - logical order
    holder.isExecuting = false;
    holder.isRunning = false;

    // Update UI state later (asynchronous)
    setIsExecuting(false);
    setIsRunning(false);
  }, []);

  // ============================================================================
  // Return Value
  // ============================================================================

  return {
    uiState: {
      isRunning,
      isExecuting,
    },
    checkAndStartRunning,
    checkAndStartExecuting,
    stopAll,

    holder,
  };
};

module.exports = useConcurrencyControl;
