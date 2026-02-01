/**
 * @godbliss/core/utils - Utilities Index
 * 
 * Unified entry point for all utilities.
 * 
 * This file serves as an abstraction layer for the utils directory.
 * Even if the implementation of individual utilities changes, usage across the project remains consistent.
 */

// BSON utilities - External dependencies
const { BSON, ObjectId, ...otherBsonUtils } = require('bson');

// Simpl-Schema utilities
const simplSchemaUtils = require('./simpl-schema-utils');

// HTTP Client utilities
const httpClientUtils = require('./http-client-utils');

// Terminal utilities
const terminalUtils = require('./terminal-utils');

// Safe utilities
const safeUtils = require('./safe-utils');

module.exports = {
  /**
   * [External Dependencies Export Strategy]
   * 
   * We re-export external dependencies (BSON, ObjectId, SimpleSchema) here to ensure
   * `Singleton Identity` across the entire monorepo.
   * 
   * Integrating packages (like @godbliss/express, @godbliss/react) 
   * AND applications using Bliss MUST use these exported instances 
   * instead of importing their own 'bson' or 'simpl-schema' dependencies.
   * 
   * If different packages import their own versions, `instanceof` checks will fail 
   * even if the versions are identical, because they are different constructor instances in memory.
   */

  // BSON utilities - External dependencies
  BSON,
  ObjectId,
  ...otherBsonUtils,

  // Simpl-Schema utilities
  makeSchema: simplSchemaUtils.makeSchema,
  SimpleSchema: simplSchemaUtils.SimpleSchema,
  SchemaFields: simplSchemaUtils.SchemaFields,

  // HTTP Client utilities
  dataFetch: httpClientUtils.dataFetch,
  handleJson: httpClientUtils.handleJson,
  handleBson: httpClientUtils.handleBson,

  // Terminal utilities
  gateDefsFromRaw: terminalUtils.gateDefsFromRaw,
  errorDefsFromRaw: terminalUtils.errorDefsFromRaw,
  successDefsFromRaw: terminalUtils.successDefsFromRaw,
  defaultTerminalDef: terminalUtils.defaultTerminalDef,

  // Safe utilities
  safeSpreadArguments: safeUtils.safeSpreadArguments
};
