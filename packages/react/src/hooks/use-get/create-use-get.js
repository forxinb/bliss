const React = require('react');
const _ = require('lodash');
const useGate = require('../use-gate');

/**
 * Factory function to create the useGet hook.
 * 
 * @param {Object} config - Configuration for hook creation
 * @param {Object|Function} config.terminalDef - Terminal definition object or factory function (includes gateDefs, errorDefs, successDefs)
 * @param {Function} config.createQueryFn - Function to generate the query function
 * @param {Function} config.useQuery - The useQuery hook from React Query (externally injected)
 * @param {Function} config.useInfiniteQuery - The useInfiniteQuery hook from React Query (externally injected)
 * @param {Object} config.defaultOptions - Default query options
 * @returns {Function} useGet hook
 * 
 * @param {Object} [params] - Options for calling the useGet hook
 * @param {boolean} [params.isInfinite=false] - Whether to use an infinite scroll query
 * @param {Object} [params.gateContext={}] - Gate context (routeParams, queryParams, etc.)
 * @param {Object} [params.useQueryOptions={}] - Overrides for useQuery options
 * @param {QueryClient} [params.customQueryClient] - Optional custom QueryClient instance
 * 
 * @example
 * // Usage with terminal definition object (uses nested gateDefs key: 'gateDefs.<path>.<METHOD>')
 * const useGet = createUseGet({
 *   terminalDef: {
 *     gateDefs: {
 *       '/users': {
 *         GET: { path: '/users', method: 'GET' }
 *       }
 *     }
 *   },
 *   createQueryFn: (terminalDef, path, { gate, customQueryClient }) => {
 *     return async () => {
 *       return fetch(gate.urlSuffix);
 *     };
 *   },
 *   useQuery,           // Inject React Query hook
 *   useInfiniteQuery    // Inject React Query hook
 * });
 */
const createUseGet = (config) => {
  const {
    terminalDef,
    createQueryFn,
    useQuery,
    useInfiniteQuery,
    defaultOptions = {}
  } = config;

  if (!terminalDef) {
    throw new Error('terminalDef is required');
  }

  if (!createQueryFn) {
    throw new Error('createQueryFn is required');
  }

  if (!useQuery) {
    throw new Error('useQuery is required');
  }

  if (!useInfiniteQuery) {
    throw new Error('useInfiniteQuery is required');
  }

  return (path, params = {}) => {
    const {
      isInfinite = false, // Note: isInfinite is only applied on the initial render
      gateContext = {},
      useQueryOptions = {},
      customQueryClient
    } = params;

    // Fixed once on mount; dynamic changes would violate the Rules of Hooks, so they are not allowed
    const [queryHook] = React.useState(() => (isInfinite ? useInfiniteQuery : useQuery));

    // Extract gate info using useGate (terminal-utils.gateDefsFromRaw: using nested keys)
    const gateDef = React.useMemo(() => {
      const _gateDef = _.get(terminalDef, `gateDefs.${path}.GET`);
      if (!_gateDef) {
        throw new Error(`Gate not found for path: ${path} (method: GET)`);
      }
      return _gateDef;
    }, [path]);

    // Note: Triggers for useGate re-render
    // - path changes: gateDef re-calculated via useMemo([path]) -> useGate re-called
    // - gateContext changes: urlSuffix/queryKey updated on routeParams / queryParams / additionalQueryKey changes
    // - functional schema anti-pattern: if the schema function returns a new SimpleSchema instance on every render
    //   for the same schemaSelector, form re-initialization will repeat, potentially causing infinite renders.
    //   -> Fix: return the same instance for the same selector, change selector values for meaning changes.
    // - initialForm behavior: form re-assigned -> render on schema change
    // - Reference changes: re-execution possible if the parent creates a new gateContext object every time (useMemo recommended)
    const gate = useGate(gateDef, gateContext);

    // Create query function (pass useGate results) - regenerated only when necessary
    // Impact of gateContext on queryKey/urlSuffix (Overview):
    // - gateContext.routeParams: replaces ":param" in gateDef.path -> gate.urlSuffix changes
    // - gateContext.queryParams: adds/changes ?key=value -> gate.urlSuffix changes
    // - gateContext.additionalQueryKey: merges additional elements into the query key -> gate.queryKey changes
    // These changes directly impact the cache key (queryKey) and request URL (urlSuffix),
    // serving as core triggers for data fetching/refetching.
    const queryFn = React.useMemo(() => {
      // Explicitly pass the gate object for clarity (instead of spread operator)
      // Since createQueryFn is typically written once per project, clarity is more important than convenience.
      const fn = createQueryFn({
        gate,
        customQueryClient,
      });
      if (!_.isFunction(fn)) {
        throw new Error('createQueryFn must return a function');
      }
      return fn;
    }, [
      // Dependency notes:
      // - Minimum: urlSuffix, queryKey
      // - Actual required dependencies may vary based on use cases (headers, auth, env vars, etc.)
      //   -> Ongoing review/reinforcement needed based on actual usage.
      gate.urlSuffix,
      Array.isArray(gate.queryKey) ? gate.queryKey.join('|') : gate.queryKey,
      customQueryClient
    ]);

    return queryHook({
      ...defaultOptions,
      ...useQueryOptions,
      queryKey: gate.queryKey,  // Use the query key generated by useGate
      queryFn,
    }, customQueryClient);
  };
};

module.exports = createUseGet;
