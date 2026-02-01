const rawErrorDefs = require('./raw-error-defs');
const rawGateDefs = require('./raw-gate-defs');
const rawSuccessDefs = require('./raw-success-defs');
const { 
  errorDefsFromRaw,
  successDefsFromRaw,
  gateDefsFromRaw
} = require('../defs-from-raw');

// New terminal structure with GroupedBy naming (010 convention)
const defaultTerminalDef = {
  errorDefs: errorDefsFromRaw(rawErrorDefs),
  successDefs: successDefsFromRaw(rawSuccessDefs),
  gateDefs: gateDefsFromRaw(rawGateDefs)
};

module.exports = defaultTerminalDef;
module.exports.rawErrorDefs = rawErrorDefs;
module.exports.rawGateDefs = rawGateDefs;
module.exports.rawSuccessDefs = rawSuccessDefs;

// New API exports (010 naming convention)
module.exports.errorDefs = defaultTerminalDef.errorDefs;
module.exports.successDefs = defaultTerminalDef.successDefs;
module.exports.gateDefs = defaultTerminalDef.gateDefs;
