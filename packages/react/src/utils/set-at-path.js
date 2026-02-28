const _ = require('lodash');
const { action, isObservableArray } = require('mobx');

/**
 * setAtPath
 * 
 * Sets a value at a specific string path in an object while maintaining MobX reactivity.
 * 
 * Key Features:
 * 1. MobX Reactivity: If the target field is an Observable Array, it uses .replace() 
 *    to preserve the array's reference and trigger fine-grained updates.
 * 2. Safe Path Navigation: Automatically creates intermediate objects/arrays via _.set.
 * 
 * @param {Object} obj - The target object/observable state
 * @param {string} path - Dot-notation path (e.g., 'user.profile.name' or 'items.0.name' or 'items[0].name')
 * @param {*} value - The value to set
 */
const setAtPath = action((obj, path, value) => {
  if (obj == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Bliss:setAtPath] Target object is null or undefined. Cannot set path: "${path}"`);
    }
    return;
  }

  // 1. Path type check: strictly handles single string paths only.
  if (typeof path !== 'string') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Bliss:setAtPath] 'path' must be a string. Provided:`, path);
    }
    return;
  }

  // 2. Resolve and validate path
  const paths = _.toPath(path);

  // Skip if path is empty or has invalid/empty segments (e.g., 'a..b')
  const hasInvalidPart = _.some(paths, p => !p && p !== '0');
  if (paths.length === 0 || hasInvalidPart) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Bliss:setAtPath] Invalid path provided: "${path}"`);
    }
    return;
  }

  // 3. Assignment with MobX Awareness
  // We use _.get to check if the current leaf is an Observable Array.
  const currentValue = _.get(obj, path);

  if (isObservableArray(currentValue) && _.isArray(value)) {
    currentValue.replace(value);
  } else {
    _.set(obj, path, value);
  }
});

/**
 * patchObj (Patch Object)
 * 
 * Deeply traverses a patch object and applies each leaf value using setAtPath().
 * This ensures MobX reactivity is maintained for every path.
 * 
 * @param {Object} obj - The target object/observable state
 * @param {Object} patch - A plain object representing nested updates
 */
const patchObj = action((obj, patch) => {
  if (obj == null || !_.isPlainObject(patch)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Bliss:patchObj] Invalid arguments. 'obj' must be defined and 'patch' must be a plain object.`);
    }
    return;
  }

  const traverse = (currentObj, currentPath = []) => {
    _.each(currentObj, (value, key) => {
      const fullPath = [...currentPath, key];

      if (_.isPlainObject(value)) {
        // Recursive traversal for plain objects
        traverse(value, fullPath);
      } else {
        // Reached a leaf (primitive or array): use setAtPath for the actual assignment
        setAtPath(obj, fullPath.join('.'), value);
      }
    });
  };

  traverse(patch);
});

module.exports = {
  setAtPath,
  patchObj,
  sap: setAtPath, // Keep sap as an alias for brevity if preferred
  patchForm: patchObj // Semantic alias for context-appropriate form updates
};
