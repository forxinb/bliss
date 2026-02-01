/**
 * Validates and normalizes arguments so they can be safely passed via spread operator.
 * @param {any} args - Arguments to pass to the function
 * @param {string} targetName - Target name (for warning messages)
 * @returns {Array} Normalized arguments array
 */
const safeSpreadArguments = (args, targetName = 'Target') => {
  if (!Array.isArray(args)) {
    console.warn(`${targetName} arguments must be an array, got:`, typeof args);
    console.warn('The provided arguments will be ignored and empty array will be used instead.');
    return [];
  }
  return args;
};

module.exports = {
  safeSpreadArguments
};
