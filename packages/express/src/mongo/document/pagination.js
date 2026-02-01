const _ = require('lodash');
const { ObjectId } = require('@godbliss/core/utils');
const { PAGINATION } = require('./constants');

/**
 * ⚠️  IMPORTANT: Cursor Semantics
 * 
 * `after`/`before` refer to the position of items in the sorted data sequence 
 * (according to the current sort order), not to the time sequence.
 * 
 * Example:
 *   // Descending sort (newest first): _id: 300 (2025-11-01), 200 (2025-10-01), 100 (2025-09-01)
 *   // Page1 [300, 200], Page2 [100, ...]
 *   
 *   Request: after = 200 → returns 100 (older, further in time)
 *
 */


/**
 * Check if a value is a valid ObjectId instance
 * @param {*} value - Value to check
 * @returns {boolean} True if valid ObjectId instance
 */
function isValidObjectIdInstance(value) {
  return value instanceof ObjectId && ObjectId.isValid(value);
}

/**
 * Check if a value can be converted to ObjectId
 * @param {*} value - Value to check
 * @returns {boolean} True if value can be ObjectId
 */
function canBeObjectId(value) {
  return ObjectId.isValid(value);
}

/**
 * Check if a value can be used as a cursor
 * @param {*} cursor - Value to check
 * @returns {boolean} True if value can be used as cursor (null, string, ObjectId)
 */
function _canBeCursor(cursor) {
  return cursor !== undefined;
}

/**
 * Normalize a pagination object.
 *
 * Accepts (all optional):
 * - page: string|number
 * - pageSize: string|number (preferred; frontend-friendly standard)
 * - after: string|ObjectId (cursor for forward pagination)
 * - before: string|ObjectId (cursor for backward pagination)
 * - cursorField: string
 * - suppressObjectIdConversion: boolean (default: false)
 *
 * Returns:
 * - pageSize: positive integer, capped by PAGINATION.MAX_LIMIT (default 10)
 * - cursorField: provided value or PAGINATION.DEFAULT_CURSOR_FIELD
 * - page?: included only when a positive integer was provided
 * - after?: included only when provided
 * - before?: included only when provided
 *
 * Notes: Use `pageSize` (frontend-friendly) instead of `limit`.
 * - `after`: cursor for forward pagination (after this cursor, null for first page)
 * - `before`: cursor for backward pagination (before this cursor, null for first page)
 * - Precedence: `after`/`before` → cursor-mode; else if valid `page` → page-mode; else none-mode.
 *
 * Pagination Modes:
 * - 'cursor': Uses after/before cursors for pagination (determined by determinePaginationMode)
 * - 'page': Uses page numbers with skip/limit (determined by determinePaginationMode)
 * - 'none': No pagination applied, returns all results (determined by determinePaginationMode)
 *
 * @param {Object} pagination - Raw pagination object
 * @returns {Object} Normalized pagination
 */
function _normalizePagination(pagination = {}) {
  // Warn if conflicting pagination params are provided
  if (_canBeCursor(pagination.after) && _canBeCursor(pagination.before)) {
    // eslint-disable-next-line no-console
    console.warn('[pagination] Both after and before are provided. Use only one.');
  }
  if ((_canBeCursor(pagination.after) || _canBeCursor(pagination.before)) && pagination.page) {
    // eslint-disable-next-line no-console
    console.warn('[pagination] Cursor pagination and page pagination provided. Use only one.');
  }

  // Parse input values safely
  const page = Number.parseInt(pagination.page, 10);
  const pageSize = Number.parseInt(pagination.pageSize, 10);
  let after = pagination.after;
  let before = pagination.before;

  // Convert string ObjectId to ObjectId instance if valid (unless suppressed)
  if (canBeObjectId(after) && !pagination.suppressObjectIdConversion) {
    after = new ObjectId(after);
  }
  if (canBeObjectId(before) && !pagination.suppressObjectIdConversion) {
    before = new ObjectId(before);
  }

  const hasValidPage = Number.isInteger(page) && page > 0;

  // Return normalized object with defaults and validation
  return {
    // Default values
    pageSize: Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, PAGINATION.MAX_LIMIT)
      : 10,
    cursorField: pagination.cursorField || PAGINATION.DEFAULT_CURSOR_FIELD,
    // Only include valid values
    ...(hasValidPage && { page }),
    ...(after && { after }),
    ...(before && { before }),
  };
}

/**
 * Determine pagination mode and prepare query parameters
 * @param {Object} selector - Base query selector
 * @param {Object} queryOptions - MongoDB query options (sort, projection, hint, etc.)
 * @param {Object} normalizedPagination - Normalized pagination object
 * @returns {Object} Mode, resolved selector, skip, limit, sort, and resolved query options
 */
function _resolvePaginationQuerySpec(selector, queryOptions, normalizedPagination) {
  const { sort = PAGINATION.DEFAULT_SORT, skip: querySkip, limit: queryLimit, ...otherOptions } = queryOptions;
  
  // Warn if skip/limit are provided in queryOptions (they should be in pagination parameter)
  if (querySkip !== undefined || queryLimit !== undefined) {
    // eslint-disable-next-line no-console
    console.warn('[pagination] skip/limit in queryOptions will be ignored. Use pagination parameter instead.');
  }
  
  let skip = undefined;
  let resolvedSelector = selector;
  let mode = 'none';
  const limit = normalizedPagination.pageSize;

  if (_canBeCursor(normalizedPagination.after) || _canBeCursor(normalizedPagination.before)) {
    mode = 'cursor';
    resolvedSelector = _buildCursorConditions(selector, sort, normalizedPagination.cursorField, normalizedPagination.after, normalizedPagination.before);
  } else if (normalizedPagination.page) {
    mode = 'page';
    skip = (normalizedPagination.page - 1) * limit;
  } else {
    // pageSize only means none mode (all results)
    mode = 'none';
  }

  return { mode, resolvedSelector, resolvedQueryOptions: otherOptions, sort, skip, limit };
}

/**
 * Build cursor conditions for cursor-based pagination.
 *
 * Behavior:
 * - When `after` is provided, injects `$lt` condition for forward pagination.
 * - When `before` is provided, injects `$gt` condition for backward pagination.
 * - For backward pagination, flips sort direction for `cursorField` to maintain correct windowing.
 *
 * Side effects:
 * - Mutates the provided `sort` object to reflect the flipped direction when `before` is used.
 *
 * @param {Object} selector - Base Mongo selector
 * @param {Object} sort - Sort object (will be mutated for backward navigation)
 * @param {string} cursorField - Field used as the pagination cursor (e.g., '_id', 'updatedAt', 'createdAt')
 * @param {string|ObjectId|null} after - Cursor for forward pagination (after this cursor, null for first page)
 * @param {string|ObjectId|null} before - Cursor for backward pagination (before this cursor, null for first page)
 * @returns {Object} New selector with cursor condition merged
 */
function _buildCursorConditions(selector, sort, cursorField, after, before) {
  const sel = _.cloneDeep(selector || {});

  if (!_canBeCursor(after) && !_canBeCursor(before)) {
    // No cursor provided
    return sel;
  }

  if (after === null || before === null) {
    // null means first page - no cursor condition needed
    return sel;
  }

  // See CURSOR SEMANTICS note about `after`/`before` at top of file

  if (after) {
    // Forward pagination: after this cursor (exclusive)
    const cursorSortDirection = _.get(sort, cursorField, -1);
    // For descending sort (-1): after means smaller values ($lt)
    // For ascending sort (1): after means larger values ($gt)
    const op = cursorSortDirection === -1 ? '$lt' : '$gt';
    
    return _makeSelectorWithPaginationRangeConditionOnField(sel, cursorField, { [op]: after });
  }

  if (before) {
    // Backward pagination: before this cursor (exclusive)
    const cursorSortDirection = _.get(sort, cursorField, -1);
    // Flip sort direction for backward pagination
    const flippedSortDirection = -1 * cursorSortDirection;
    _.set(sort, cursorField, flippedSortDirection);
    // For descending sort (-1): before means larger values ($gt)
    // For ascending sort (1): before means smaller values ($lt)
    const op = cursorSortDirection === -1 ? '$gt' : '$lt';
    return _makeSelectorWithPaginationRangeConditionOnField(sel, cursorField, { [op]: before });
  }

  // No cursor provided, return original selector
  return sel;
}

/**
 * Make a new selector with an additional pagination range condition on a specific field.
 *
 * Intent (pagination-only):
 * - Add range operators for paging windows. Allowed operators: $lt, $lte, $gt, $gte
 * - Does NOT mutate the input selector; returns a cloned selector
 *
 * Behavior:
 * - Field is an object: merge allowed range operators into the existing condition object
 * - Field is an array: upgrade to { $in: array } and merge the range operators
 * - Field is a scalar (equality): for pagination ranges this is semantically conflicting;
 *   current behavior replaces scalar with the provided range condition (callers should avoid mixing)
 * - Logical nodes ($and/$or/$nor): do not merge at that level; recurse into branches and merge where
 *   non-logical keys exist
 * - Nested paths (e.g., 'user.id') are not supported; only direct field names are targeted
 *
 * Notes:
 * - Internal helper for pagination; not exported publicly. Exposed under _internals only in test env.
 *
 * @param {Object} selector - Base selector (will be cloned)
 * @param {string} field - Field name to apply pagination range condition to
 * @param {Object} condition - Range condition (one of $lt/$lte/$gt/$gte)
 * @returns {Object} New selector with the range condition merged
 */
function _makeSelectorWithPaginationRangeConditionOnField(selector, field, condition) {
  const root = _.cloneDeep(selector || {});

  function addFieldConditionToObject(obj) {
    if (Object.prototype.hasOwnProperty.call(obj, field)) {
      const current = obj[field];
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        obj[field] = Object.assign({}, current, condition);
      } else if (Array.isArray(current)) {
        obj[field] = Object.assign({}, { $in: current }, condition);
      } else {
        obj[field] = Object.assign({}, condition);
      }
    } else {
      obj[field] = Object.assign({}, condition);
    }
    return obj;
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return node;
    
    // If node is empty object, add field condition directly
    if (Object.keys(node).length === 0) {
      return addFieldConditionToObject(node);
    }
    
    let merged = false;
    for (const key of Object.keys(node)) {
      if (key === '$and' || key === '$or' || key === '$nor') {
        const arr = node[key];
        if (Array.isArray(arr)) {
          node[key] = arr.map((sub) => walk(sub));
        }
      } else if (!merged) {
        node = addFieldConditionToObject(node);
        merged = true;
      }
    }
    return node;
  }

  return walk(root);
}

/**
 * Execute a MongoDB find query with windowing and hasMore detection.
 *
 * Strategy:
 * - Request `limit + 1` documents to detect if more data exists beyond the requested window.
 * - Stop iterating once `limit` items are collected; compute `hasMore` based on cursor state.
 *
 * @param {import('mongodb').Collection} col - MongoDB collection
 * @param {Object} resolvedSelector - Resolved selector with pagination conditions
 * @param {Object} resolvedQueryOptions - Resolved query options (projection, hint, etc.)
 * @param {Object} sort - Sort object applied to the cursor
 * @param {number} skip - Offset for page-based pagination (>= 0)
 * @param {number} limit - Page/window size (requested size)
 * @returns {{ docs: Object[], hasMore: boolean }} Windowed docs and more-data flag
 */
async function _executePaginationQuery(col, resolvedSelector, resolvedQueryOptions, sort, skip, limit) {
  const cursor = col.find(resolvedSelector, resolvedQueryOptions).sort(sort);
  if (Number.isInteger(skip) && skip >= 0) cursor.skip(skip);
  cursor.limit(limit + 1);

  const docs = [];
  let hasMore = false;
  
  try {
    while (await cursor.hasNext()) {
      const d = await cursor.next();
      docs.push(d);
      if (docs.length === limit) {
        hasMore = await cursor.hasNext();
        break;
      }
    }
  } finally {
    await cursor.close();
  }

  return { docs, hasMore };
}

/**
 * Format pagination result based on mode
 * @param {Array} docs - Retrieved documents
 * @param {boolean} hasMore - Whether more documents exist
 * @param {string} mode - Pagination mode ('cursor', 'page', 'none')
 * @param {Object} normalizedPagination - Normalized pagination object
 * @returns {Object} Formatted result with data and pageInfo
 */
function _formatPaginationResult(docs, hasMore, mode, normalizedPagination = {}) {
  const { page, pageSize, cursorField, before } = normalizedPagination;
  
  if (mode === 'cursor') {
    const startCursor = docs.length ? _.get(docs[0], cursorField) : null;
    const endCursor = docs.length ? _.get(docs[docs.length - 1], cursorField) : null;
    
    // See CURSOR SEMANTICS note about `after`/`before` at top of file
    const isBackward = !!before;
    const pageInfo = {
      pageSize,
      startCursor,
      endCursor,
      ...(isBackward ? { hasPrev: hasMore } : { hasNext: hasMore })
    };
    
    return { 
      data: isBackward ? docs.reverse() : docs, 
      pageInfo 
    };
  }
  
  if (mode === 'page') {
    return { data: docs, pageInfo: { page, pageSize, hasNext: hasMore } };
  }
  
  // mode === 'none' - return basic pageInfo with cursors
  const startCursor = docs.length ? _.get(docs[0], cursorField) : null;
  const endCursor = docs.length ? _.get(docs[docs.length - 1], cursorField) : null;
  return { data: docs, pageInfo: { pageSize, hasNext: hasMore, startCursor, endCursor } };
}

/**
 * Execute pagination with all necessary steps
 * @param {import('mongodb').Collection} col - MongoDB collection
 * @param {Object} selector - Base query selector
 * @param {Object} queryOptions - MongoDB query options (sort, projection, hint, etc.)
 * @param {Object} pagination - Raw pagination object
 * @returns {Promise<Object>} Paginated result with data and pageInfo
 */
async function executePagination(col, selector, queryOptions = {}, pagination) {
  // See CURSOR SEMANTICS note about `after`/`before` at top of file
  const normalizedPagination = _normalizePagination(pagination);
  const { mode, resolvedSelector, resolvedQueryOptions, sort, skip, limit } = _resolvePaginationQuerySpec(selector, queryOptions, normalizedPagination);
  const { docs, hasMore } = await _executePaginationQuery(col, resolvedSelector, resolvedQueryOptions, sort, skip, limit);
  return _formatPaginationResult(docs, hasMore, mode, normalizedPagination);
}

module.exports = {
  executePagination,
};

// Internal functions exposed for testing and advanced usage
module.exports._internals = {
  // Execution flow:
  // 1. normalize: pagination params → normalized pagination object
  // 2. resolve: normalized pagination → query spec (mode, query, skip, limit)
  // 3. build: query + cursor conditions → final query with pagination
  // 4. execute: final query → documents + hasMore flag
  // 5. format: documents + metadata → paginated result with pageInfo
  _normalizePagination,
  _resolvePaginationQuerySpec,
  _buildCursorConditions,
  _makeSelectorWithPaginationRangeConditionOnField,
  _executePaginationQuery,
  _formatPaginationResult,
  // Utility functions
  _canBeCursor,
};
