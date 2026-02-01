const _ = require('lodash');
const React = require('react');
const useDynamicSchemaForm = require('../use-dynamic-schema-form');

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
const SUPPORTED_HTTP_METHODS = [
  'GET', 'POST', 'PUT', 'DELETE', 'PATCH',
  // 'HEAD', 'CONNECT', 'OPTIONS', 'TRACE',
];


/**
 * React hook that manages context for executing Gate API requests.
 * 
 * @param {Object} gateDef - Gate definition (path, method, schema, etc.)
 * @param {Object} gateContext - Gate execution context
 * @param {Object} gateContext.routeParams - URL path parameters
 * @param {Object} gateContext.queryParams - Query string parameters
 * @param {string} gateContext.queryStringFormat - Query string format: 'json' | 'standard' (default: 'json')
 * @param {Function} gateContext.querySerializer - Custom serializer (params) => string
 *   - Takes precedence over queryStringFormat
 *   - Example: (params) => qs.stringify(params, { arrayFormat: 'brackets' })
 * @param {Object} gateContext.schemaSelector - Values used to select or generate schema
 * @param {Function} gateContext.initialForm - Form initialization function
 * @param {Array} gateContext.additionalQueryKey - Additional keys for React Query queryKey
 * @param {Array} gateContext.extraDeps - Additional dependencies for memoization
 * @param {boolean} gateContext.debug - Enable debug logging
 * @returns {Object} Gate execution context (urlSuffix, queryKey, form, schema, etc.)
 */
const useGate = (gateDef = {}, gateContext = {}) => {
  const {
    // Base parameters
    routeParams = {},
    queryParams = {},

    // Query string formatting
    queryStringFormat = 'json',
    querySerializer = null,

    // Schema/Form management
    schemaSelector = {},
    initialForm,

    // Cache/Dependency management
    additionalQueryKey = [],
    extraDeps = [],

    // Debugging
    debug = false
  } = gateContext;

  ////////////////////////////////////////////////////////////////////////////////
  // gateDef Validation
  ////////////////////////////////////////////////////////////////////////////////
  if (!gateDef) {
    console.log('Gate not found', gateDef);
    throw new Error('Gate not found');
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Dynamic Schema and Form Management (using useDynamicSchemaForm hook)
  ////////////////////////////////////////////////////////////////////////////////

  // Prepare schema source for useDynamicSchemaForm
  const schemaSource = React.useMemo(() => {
    return _.isFunction(gateDef.schema)
      ? gateDef.schema(schemaSelector)
      : gateDef.schema;
  }, [gateDef.schema, JSON.stringify(schemaSelector)]);

  // Use the centralized dynamic schema and form management hook
  const { currentSchema, form, formAssignedAt } = useDynamicSchemaForm(schemaSource, initialForm);

  ////////////////////////////////////////////////////////////////////////////////
  // URL Suffix generation with validation
  ////////////////////////////////////////////////////////////////////////////////
  const urlSuffix = React.useMemo(() => {
    // Validate HTTP method
    const method = gateDef.method;
    if (!SUPPORTED_HTTP_METHODS.includes(method)) {
      throw new Error('Not supported methods');
    }

    let url = gateDef.path;

    // Validate and replace route params
    _.each(gateDef.path.split('/'), (key) => {
      if (key.startsWith(':')) {
        const paramName = key.split(':')[1];
        const value = _.get(routeParams, paramName);
        if (!value) {
          throw new Error(`no route param found: ${key}`);
        }
        url = url.replace(key, value);
      }
      return true; // prevent break
    });

    // Add query params
    if (!_.isEmpty(queryParams)) {
      let queryString;

      // Priority 1: Custom serializer
      if (querySerializer) {
        queryString = querySerializer(queryParams);
      }
      // Priority 2: Standard formats
      else if (queryStringFormat === 'json') {
        // JSON format (default): preserves types, supports complex structures
        const queryList = _.map(queryParams, (value, key) => {
          if (_.isArray(value) || _.isObject(value)) {
            return `${key}=${JSON.stringify(value)}`;
          }
          return `${key}=${value}`;
        });
        queryString = _.join(queryList, '&');
      }
      else if (queryStringFormat === 'standard') {
        // Standard URLSearchParams format
        const params = new URLSearchParams();
        _.each(queryParams, (value, key) => {
          if (_.isArray(value)) {
            // Arrays: repeat key (arr=1&arr=2&arr=3)
            value.forEach(v => params.append(key, v));
          } else if (_.isObject(value)) {
            // Complex objects: fallback to JSON with warning
            console.warn(`[useGate] Complex object in queryParams: ${key}, using JSON fallback`);
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
          return true; // prevent break
        });
        queryString = params.toString();
      }

      if (queryString) {
        url = url + '?' + queryString;
      }
    }

    return url;
  }, [
    gateDef.path,
    gateDef.method,
    JSON.stringify(routeParams),    // deep compare: object content changes
    JSON.stringify(queryParams),    // deep compare: object content changes
    queryStringFormat,
    querySerializer
  ]);

  ////////////////////////////////////////////////////////////////////////////////
  // Query Key generation (only for GET requests)
  ////////////////////////////////////////////////////////////////////////////////
  const queryKey = React.useMemo(() => {
    const method = gateDef.method;
    if (['GET'].includes(method)) {
      return [
        ...(urlSuffix.split('/').filter(key => key !== '')),
        ...additionalQueryKey
      ];
    }
    return null;
  }, [
    gateDef.method,
    urlSuffix,
    JSON.stringify(additionalQueryKey)  // deep compare: array content changes
  ]);

  ////////////////////////////////////////////////////////////////////////////////
  // Debug Logging
  ////////////////////////////////////////////////////////////////////////////////
  React.useEffect(() => {
    if (debug) {
      console.log('[useGate][debug]', {
        extraDeps,
        queryKey,
        urlSuffix
      });
    }
  }, [debug, ...extraDeps, queryKey, urlSuffix]);

  ////////////////////////////////////////////////////////////////////////////////
  // Return memoized gate object
  // - Memoization prevents unnecessary re-renders in dependent hooks
  // - state.form excluded from deps: mobx observable with stable reference
  // - extraDeps spread: user's responsibility to provide stable references
  ////////////////////////////////////////////////////////////////////////////////
  const gate = React.useMemo(() => ({
    // Basic Information
    gateDef,

    // URL/Query Information
    urlSuffix,
    queryKey,

    // Schema/Form Information
    schema: currentSchema,
    form: form,  // mobx observable (stable reference, reactive content)
    formAssignedAt,

    // Dependency Information
    extraDeps
  }), [
    gateDef,
    urlSuffix,
    queryKey,
    currentSchema,
    formAssignedAt,
    ...extraDeps  // spread: consistent with React patterns
  ]);

  return gate;
};

module.exports = useGate;
