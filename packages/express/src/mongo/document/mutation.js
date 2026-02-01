const _ = require('lodash');
const { ERRORS, QUERY } = require('./constants');

/**
 * Increment/decrement operation for MongoDB collections
 * @param {Object} collection - MongoDB collection object
 * @param {string} path - Field path to modify
 * @param {Object} options - Operation options
 * @param {Object} options.selector - Query selector
 * @param {number} options.amount - Amount to increment/decrement
 * @param {Object} options.session - MongoDB session
 * @param {Object} options.defaultUpdate - Default update operations
 * @param {boolean} options.isDec - Whether to decrement instead of increment
 * @param {boolean} options.multi - Whether to update multiple documents
 * @param {boolean} options.upsert - Whether to create document if not exists
 * @param {Object} options.otherOptions - Additional MongoDB options
 * @returns {Promise<Object>} Update result
 */
async function incOperation(collection, path, { 
  selector, 
  amount = 1, 
  session, 
  defaultUpdate = {}, 
  isDec = false,
  multi = false,
  upsert = false,
  ...otherOptions
} = {}) {
  if (!path) throw new Error(ERRORS.PATH_REQUIRED);
  const update = _.merge({}, defaultUpdate, { $inc: { [path]: isDec ? -1 * amount : amount } });
  
  const mongoOptions = { session, upsert, ...otherOptions };
  
  if (multi) {
    return await collection.updateMany(selector || QUERY.NO_MATCH_SELECTOR, update, mongoOptions);
  } else {
    return await collection.updateOne(selector || QUERY.NO_MATCH_SELECTOR, update, mongoOptions);
  }
}

module.exports = { incOperation };
