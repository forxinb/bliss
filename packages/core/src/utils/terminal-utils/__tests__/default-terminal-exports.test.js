const utils = require('..');

describe('default-terminal exports contract', () => {
  test('exposes new API functions and defaultTerminalDef', () => {
    expect(typeof utils.gateDefsFromRaw).toBe('function');
    expect(typeof utils.errorDefsFromRaw).toBe('function');
    expect(typeof utils.successDefsFromRaw).toBe('function');
    expect(utils.defaultTerminalDef).toBeDefined();

    const { gateDefs, errorDefs, successDefs } = utils.defaultTerminalDef;
    expect(gateDefs).toBeDefined();
    expect(errorDefs).toBeDefined();
    expect(successDefs).toBeDefined();
  });
});
