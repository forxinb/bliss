// @godbliss/react utilities exports

// ============================================================================
// Utility Exports
// ============================================================================

// sap (Set At Path) - Sets a value at a specific path while maintaining MobX reactivity
const sap = require('./set-at-path');

module.exports = {
  sap,
  setAtPath: sap
};
