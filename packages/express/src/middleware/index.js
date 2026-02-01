// @godbliss/express - Middleware exports

// ============================================================================
// Core Middleware
// ============================================================================
// Core middlewares for BDD framework

// Gating middleware - Schema-based request validation and routing
const gating = require('./gating/index.js');

// Gating utilities - gating related utility functions
const {
  initializeTerminalDef
} = require('./gating/gating.js');

module.exports = {
  gating,
  initializeTerminalDef
};
