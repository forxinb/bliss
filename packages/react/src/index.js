// @godbliss/react - React components and hooks for Bliss framework

const { version: coreVersion } = require('@godbliss/core');

const version = '0.0.1';

// ============================================================================
// Hook Exports
// ============================================================================
// React Hooks functionality

// useGate Hook - Schema-based form management and API calls
const { useGate } = require('./hooks/index.js');

// useSchema Hook - Schema-based form rendering and validation
const { useSchema } = require('./hooks/index.js');

// useGet Hook - Hook generation factory for HTTP GET requests
const { useGet } = require('./hooks/index.js');

module.exports = {
  version,
  coreVersion,
  useGate,
  useSchema,
  useGet
};
