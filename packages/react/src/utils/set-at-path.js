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
  // Skip if the path itself or any of its array elements are falsy (except 0).
  // Note: Values like -1 are truthy in JS. If provided as a path segment, they are handled by 
  // the default behavior of _.set (e.g., added as a string property on objects, or a 
  // custom property on arrays). We intentionally leave this unvalidated to allow for 
  // flexible, though non-standard, assignment use-cases.
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
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Set At Path] Invalid or empty path provided: ${path}`);
    }
    return;
  }

  // 3. Assignment with MobX Awareness
  // We use _.get to check if the current leaf is an Observable Array.
  // If it is, we use .replace() to maintain reactivity.
  // Otherwise, we delegate everything else (including intermediate path creation) to _.set.
  const currentValue = _.get(obj, path);

  if (isObservableArray(currentValue) && _.isArray(value)) {
    currentValue.replace(value);
  } else {
    _.set(obj, path, value);
  }
});

module.exports = sap;
