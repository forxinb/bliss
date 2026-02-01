const _ = require('lodash');

/**
 * validateObjectStructure - Validate object structure
 * 
 * @param {Object} obj - Object to validate
 * @param {string} path - Path (for error message)
 * @param {string} expectedType - Expected type (for error message)
 * @throws {Error} If object is invalid
 */
const validateObjectStructure = (obj, path, expectedType) => {
  // Exception if falsy value or not a Plain Object
  // Note: This function should be used carefully at runtime
  // Exceptions due to invalid def structure can stop the server
  if (_.isEmpty(obj) || !_.isPlainObject(obj)) {
    throw new Error(`Invalid ${expectedType} structure for '${path}': expected plain object, got ${typeof obj}`);
  }
};

/**
 * errorAndSuccessDefsFromRaw - Build Error/Success definitions
 * 
 * @param {Object} rawDefs - Raw Error or Success definitions
 * @returns {Object} Built Error/Success definition object
 * 
 * @example
 * const rawErrorDefs = {
 *   request: {
 *     bad: { code: 400 },
 *     validationError: (custom) => ({ code: 400, ...custom })
 *   }
 * };
 * 
 * const errorDefs = errorAndSuccessDefsFromRaw(rawErrorDefs);
 * // Result: { request: { bad: { type: 'request', name: 'bad', code: 400 } } }
 */
const errorAndSuccessDefsFromRaw = (rawDefs) => {
  const result = {};

  _.each(rawDefs, (def, type) => {
    validateObjectStructure(def, type, 'def');

    _.each(def, (elem, name) => {
      if (_.isFunction(elem)) {
        _.set(result, `${type}.${name}`, (custom = {}) => {
          return _.merge({ type, name }, elem(custom));
        });
      } else {
        _.set(result, `${type}.${name}`, _.merge({ type, name }, elem));
      }
    });
  });

  return result;
};

/**
 * gateDefsFromRaw - Convert Raw gate definitions to processed gate definitions
 * 
 * ⚠️ **IMPORTANT**: Structure of input and output is different!
 * 
 * @param {Object} rawDefs - Raw gate definitions (3-level structure): { firstPath: { lastPath: { method: gateData } } }
 * @returns {Object} gateDefs - Processed gate definitions (2-level structure): { path: { method: gateData } }
 * 
 * @example
 * // Input (3-level)
 * const rawGateDefs = {
 *   '/users': {                    // firstPath
 *     '/:userId': {               // lastPath
 *       'GET': { schema: userSchema }  // method: gateData
 *     }
 *   }
 * };
 * 
 * // Output (2-level)
 * const gateDefs = {
 *   '/users/:userId': {           // path (firstPath + lastPath)
 *     'GET': {                    // method
 *       schema: userSchema,
 *       path: '/users/:userId',   // added
 *       method: 'GET'             // added
 *     }
 *   }
 * };
 * 
 * // Transformation Process:
 * // 1. firstPath + lastPath = path
 * // 2. Flatten 3-level structure to 2-level
 * // 3. Add path and method to gateData
 */
const gateDefsFromRaw = (rawDefs) => {
  const gateDefs = {};

  // 3-level structure: firstPath -> lastPath -> method
  _.each(rawDefs, (def, firstPath) => {        // def = user, post (key1)
    validateObjectStructure(def, firstPath, 'def');
    _.each(def, (elem, lastPath) => {       // elem = '/', '/:userId' (key2)
      validateObjectStructure(elem, `${firstPath}${lastPath}`, 'elem');
      const path = `${firstPath}${lastPath}`;
      _.each(elem, (gateDef, method) => {  // gateDef = { schema, formPath, ... } (key3: gateDef)
        validateObjectStructure(gateDef, `${path}.${method}`, 'gateDef');
        _.set(gateDefs, `${path}.${method}`, { ...gateDef, path, method });
        return true; // prevent break
      });
      return true; // prevent break
    });
    return true; // prevent break
  });

  return gateDefs;
};


// New API functions based on 010 naming convention
/**
 * errorDefsFromRaw - Convert raw error definitions to processed error definitions
 * 
 * @param {Object} rawErrorDefs - Raw error definitions
 * @returns {Object} errorDefs - Processed error definitions grouped by type
 * 
 * @example
 * const rawErrorDefs = {
 *   request: {
 *     bad: { code: 400 },
 *     validationError: (custom) => ({ code: 400, ...custom })
 *   }
 * };
 * 
 * const errorDefs = errorDefsFromRaw(rawErrorDefs);
 * // Result: { request: { bad: { type: 'request', name: 'bad', code: 400 } } }
 */
const errorDefsFromRaw = (rawErrorDefs) => errorAndSuccessDefsFromRaw(rawErrorDefs);

/**
 * successDefsFromRaw - Convert raw success definitions to processed success definitions
 * 
 * @param {Object} rawSuccessDefs - Raw success definitions
 * @returns {Object} successDefs - Processed success definitions grouped by type
 * 
 * @example
 * const rawSuccessDefs = {
 *   response: {
 *     ok: { code: 200 }
 *   }
 * };
 * 
 * const successDefs = successDefsFromRaw(rawSuccessDefs);
 * // Result: { response: { ok: { type: 'response', name: 'ok', code: 200 } } }
 */
const successDefsFromRaw = (rawSuccessDefs) => errorAndSuccessDefsFromRaw(rawSuccessDefs);



module.exports = {
  validateObjectStructure,
  errorAndSuccessDefsFromRaw,
  // API functions (010 naming convention)
  errorDefsFromRaw,
  successDefsFromRaw,
  gateDefsFromRaw
};
