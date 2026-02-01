// Bliss Express - Route Handler Wrapper Utilities

const _ = require('lodash');

// ============================================================================
// Route Handler Wrapper
// ============================================================================

/**
 * Wraps Express route handler to automate error handling.
 * Supports both synchronous and asynchronous functions.
 * 
 * @param {Function} handler - Express route handler function (both sync/async supported)
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Using async function
 * const createUser = execute(async (req, res, next) => {
 *   const user = await UserService.create(req.body);
 *   res.json(user);
 * });
 * 
 * // Using sync function
 * const getStatus = execute((req, res, next) => {
 *   res.json({ status: 'ok' });
 * });
 * 
 * // Use in Express route
 * router.post('/users', createUser);
 * router.get('/status', getStatus);
 */
const execute = (handler) => {
  // Error handling if not a function
  if (!_.isFunction(handler)) {
    return (req, res, next) => {
      next(new Error('execute: handler must be a function'));
    };
  }

  // Wrap handler to automatically pass errors to next(err)
  return async (req, res, next) => {
    try {
      // await works fine with synchronous functions too
      // - sync function: execute immediately and return result
      // - async function: wait for Promise and return result
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { execute };
