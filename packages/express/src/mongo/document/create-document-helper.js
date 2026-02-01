const _ = require('lodash');
const { ERRORS } = require('./constants');
const { getSafeSelector, getCollectionFromCollections } = require('./utils');
const { executePagination } = require('./pagination');
const { incOperation } = require('./mutation');

/**
 * Create MongoDB document helper
 * @param {Object} params - Parameters
 * @param {Object} params.Collections - Collections registry object
 * @returns {Object} Document helper object
 */
function createDocumentHelper({ Collections } = {}) {
  if (!Collections) throw new Error(ERRORS.COLLECTIONS_REQUIRED);

  /**
   * Get a MongoDB collection with validation
   * @param {string} collectionName - Collection name
   * @returns {Object} MongoDB collection
   * @throws {Error} If collection not found
   */
  function getCollection(collectionName) {
    return getCollectionFromCollections(Collections, collectionName);
  }

  /**
   * Find a single document
   * @param {string} collectionName - Collection name
   * @param {Object} selector - Query selector
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Found document or null
   */
  async function findDoc(collectionName, selector, options = {}) {
    const col = getCollection(collectionName);
    const query = getSafeSelector(selector);
    return await col.findOne(query, options);
  }

  /**
   * Find documents in a collection with pagination support
   * @param {string} collectionName - Name of the collection
   * @param {Object|string} [selector={}] - MongoDB selector or 'all' for full collection query
   * @param {Object} [options={}] - Query options (sort, projection, etc.)
   * @param {Object} [pagination={}] - Pagination options (page, pageSize, after, before)
   * @example
   * // Full collection query
   * findDocs('users', 'all')
   * 
   * // Security: Empty selector will return no results (prevents accidental full collection scan)
   * findDocs('users', {})  // Returns no results
   * 
   * // Conditional query
   * findDocs('users', { name: 'John' })
   * 
   * // Complex conditional query
   * findDocs('users', { $or: [{ name: 'John' }, { age: { $gt: 18 } }] })
   * 
   * // Pagination
   * findDocs('users', 'all', {}, { page: 1, pageSize: 10 })
   * 
   * // Cursor pagination
   * findDocs('users', 'all', {}, { after: 'cursor123', pageSize: 10 })
   * @returns {Promise<Object>} Paginated result with data and pageInfo
   */
  async function findDocs(collectionName, selector, options = {}, pagination = {}) {
    const col = getCollection(collectionName);
    const query = getSafeSelector(selector);    
    return await executePagination(col, query, options, pagination);
  }

  /**
   * Insert a single document
   * @param {string} collectionName - Collection name
   * @param {Object} form - Document to insert
   * @param {Object} options - Insert options (session, writeConcern, etc.)
   * @returns {Promise<Object>} Insert result
   */
  async function insertDoc(collectionName, form, options = {}) {
    const col = getCollection(collectionName);
    return await col.insertOne(form, options);
  }

  /**
   * Upsert a single document
   * @param {string} collectionName - Collection name
   * @param {Object} selector - Query selector
   * @param {Object} form - Document to upsert
   * @param {Object} options - Upsert options (session, writeConcern, etc.)
   * @returns {Promise<Object>} Upsert result
   */
  async function upsertDoc(collectionName, selector, form, options = {}) {
    const col = getCollection(collectionName);
    return await col.updateOne(selector, { $set: form }, { upsert: true, ...options });
  }

  /**
   * Update a single document
   * @param {string} collectionName - Collection name
   * @param {Object} selector - Query selector
   * @param {Object} update - Update operations
   * @param {Object} options - Update options (session, writeConcern, arrayFilters, etc.)
   * @returns {Promise<Object>} Update result
   */
  async function updateDoc(collectionName, selector, update, options = {}) {
    const col = getCollection(collectionName);
    const r = await col.updateOne(selector, update, options);
    return r;
  }

  /**
   * Delete a single document
   * @param {string} collectionName - Collection name
   * @param {Object} selector - Query selector
   * @param {Object} options - Delete options (session, writeConcern, etc.)
   * @returns {Promise<Object>} Delete result
   */
  async function deleteDoc(collectionName, selector, options = {}) {
    const col = getCollection(collectionName);
    return await col.deleteOne(selector, options);
  }

  /**
   * Increment a field value
   * @param {string} collectionName - Collection name
   * @param {string} path - Field path to increment
   * @param {Object} opts - Increment options
   * @returns {Promise<Object>} Update result
   */
  async function increase(collectionName, path, opts = {}) {
    const col = getCollection(collectionName);
    return incOperation(col, path, { ...opts, isDec: false });
  }

  /**
   * Decrement a field value
   * @param {string} collectionName - Collection name
   * @param {string} path - Field path to decrement
   * @param {Object} opts - Decrement options
   * @returns {Promise<Object>} Update result
   */
  async function decrease(collectionName, path, opts = {}) {
    const col = getCollection(collectionName);
    return incOperation(col, path, { ...opts, isDec: true });
  }


  return {
    findDoc,
    findDocs,
    insertDoc,
    upsertDoc,
    updateDoc,
    deleteDoc,
    increase,
    decrease,
    getCollection,
  };
}

module.exports = { createDocumentHelper };
