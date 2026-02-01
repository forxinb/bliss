const _ = require('lodash');
const { QUERY, ERRORS } = require('./constants');

/**
 * Get a safe selector that never results in a full collection scan by default.
 *
 * Security note:
 * - An empty selector is replaced with QUERY.NO_MATCH_SELECTOR (e.g., `{ _id: 'not to find any' }`).
 * - Tests or callers must provide an explicit match-all selector when intended
 *   (e.g., `{ _id: { $exists: true } }`).
 *
 * Scope limitation:
 * - This function only validates selector structure (empty vs non-empty, plain object vs other types)
 * - MongoDB operator validity is NOT validated here (e.g., `{ $invalid: 'operator' }` will pass through)
 * - Invalid MongoDB operators will cause errors at the MongoDB query execution level
 *
 * @param {Object} selector - User-supplied selector
 * @returns {Object} Safe selector (possibly non-matching)
 */
function getSafeSelector(selector) {
  if (selector === 'all') {
    return {};  // Full collection query
  }
  
  if (!_.isPlainObject(selector) || _.isEmpty(selector)) {
    // eslint-disable-next-line no-console
    console.warn('[getSafeSelector] Invalid selector provided. This will return no results. Use "all" for full collection query or provide a valid selector object.');
    return QUERY.NO_MATCH_SELECTOR;  // Security: prevent accidental full collection scan
  }
  
  return selector;  // Normal selector
}

/**
 * Get collection from Collections registry with validation
 * @param {Object} Collections - Collections registry object
 * @param {string} collectionName - Collection name
 * @returns {Object} MongoDB collection
 * @throws {Error} If collection not found
 */
function getCollectionFromCollections(Collections, collectionName) {
  const col = Collections[collectionName];
  if (!col) throw new Error(ERRORS.COLLECTION_NOT_FOUND(collectionName));
  return col;
}

module.exports = {
  getSafeSelector,
  getCollectionFromCollections,
};
