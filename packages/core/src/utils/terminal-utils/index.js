// Bliss Core terminal utilities

const terminalUtils = require('./defs-from-raw');
const defaultTerminalDef = require('./default-terminal-def');

module.exports = {
  // API functions (010 naming convention)
  errorDefsFromRaw: terminalUtils.errorDefsFromRaw,
  successDefsFromRaw: terminalUtils.successDefsFromRaw,
  gateDefsFromRaw: terminalUtils.gateDefsFromRaw,

  // Default terminal definitions
  defaultTerminalDef,

  // Raw definitions (010 naming convention)
  rawErrorDefs: defaultTerminalDef.rawErrorDefs,
  rawGateDefs: defaultTerminalDef.rawGateDefs,
  rawSuccessDefs: defaultTerminalDef.rawSuccessDefs,

  // Processed definitions (010 naming convention)
  errorDefs: defaultTerminalDef.errorDefs,
  successDefs: defaultTerminalDef.successDefs,
  gateDefs: defaultTerminalDef.gateDefs
};
