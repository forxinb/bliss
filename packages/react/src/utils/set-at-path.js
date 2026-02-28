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
 */
const sap = action((obj, path, value) => {
  // 1. Batch Merge: Handle map-style updates (e.g., sap(state, { a: 1, b: 2 }))
  if (_.isPlainObject(path)) {
    _.merge(obj, path);
    return;
  }

  // 2. Resolve and validate path
  // Skip if the path itself or any of its array elements are falsy (except 0)
  let isValidPath = true;

  const isInvalidPathPart = (p) => !p && p !== 0;
  if (_.isArray(path)) {
    isValidPath = !_.some(path, isInvalidPathPart);
  } else if (isInvalidPathPart(path)) {
    isValidPath = false;
  }

  const paths = _.toPath(path); // Safely handles 'a.b.c', 'a[0].b', numbers, etc.
  if (paths.length === 0) isValidPath = false;

  if (!isValidPath) {
    console.warn(`[Set At Path] Invalid or empty path provided: ${path}`);
    return;
  }

  // 3. Extract final key to prepare for assignment
  const lastKey = paths.pop();

  // Navigate to the container of the final key
  let target = obj;
  if (paths.length > 0) {
    target = _.get(obj, paths);

    // Intermediate path safeguard: create {} ONLY if target is truly missing (null or undefined)
    // This prevents overwriting valid falsy values like 0, false, or ""
    if (target == null) {
      _.set(obj, paths, {});
      target = _.get(obj, paths);
    }
  }

  // 4. Final assignment with MobX awareness
  if (target && isObservableArray(target[lastKey])) {
    // Observable Array: use .replace() to keep reference and maintain reactivity
    target[lastKey].replace(value);
  } else if (target) {
    // Standard property assignment: triggers MobX observers normally
    target[lastKey] = value;
  }
});

module.exports = sap;
