const _ = require('lodash');
const { action, isObservableArray } = require('mobx');

/**
 * sap (Set At Path)
 * 
 * Sets a value at a specific path in an object while maintaining MobX reactivity.
 * 
 * Key Features:
 * 1. Batch Merge: If path is a plain object, it performs a deep merge into obj.
 * 2. MobX Reactivity: If the target field is an Observable Array, it uses .replace() 
 *    to preserve the array's reference and trigger fine-grained updates.
 * 3. Safe Path Navigation: Automatically creates intermediate objects if the path doesn't exist.
 * 
 * @param {Object} obj - The target object/observable state
 * @param {string|Object} path - Dot-notation path (e.g., 'user.profile.name') or a map for batch update
 * @param {*} value - The value to set (ignored if path is a map)
 * @returns {*} The result of the assignment
 */
const sap = action((obj, path, value) => {
  // 1. Batch Merge: Handle map-style updates (e.g., sap(state, { a: 1, b: 2 }))
  if (_.isPlainObject(path)) {
    return _.merge(obj, path);
  }

  if (typeof path !== 'string') return undefined;

  // 2. Resolve path components
  const paths = _.toPath(path); // Safely handles 'a.b.c' or 'a[0].b'
  const lastKey = paths.pop();

  // Navigate to the container of the final key
  let target = obj;
  if (paths.length > 0) {
    target = _.get(obj, paths);

    // Intermediate path safeguard: create {} if not present
    if (!target) {
      _.set(obj, paths, {});
      target = _.get(obj, paths);
    }
  }

  // 3. Final assignment with MobX awareness
  let result;
  if (target && isObservableArray(target[lastKey])) {
    // Observable Array: use .replace() to keep reference and maintain reactivity
    // This allows subscribers to remain bound to the same array instance
    result = target[lastKey].replace(value);
  } else if (target) {
    // Standard property assignment: triggers MobX observers normally
    target[lastKey] = value;
    result = value;
  }

  return result;
});

module.exports = sap;
