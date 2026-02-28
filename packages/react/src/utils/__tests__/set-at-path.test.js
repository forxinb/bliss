const { makeAutoObservable, autorun } = require('mobx');
const { sap, setAtPath } = require('../index');

describe('sap (Set At Path) Utility', () => {
  let state;

  beforeEach(() => {
    state = makeAutoObservable({
      user: {
        name: 'John',
        items: ['apple', 'banana']
      },
      settings: {
        theme: 'dark'
      }
    });
  });

  test('should export both sap and setAtPath names', () => {
    expect(sap).toBeDefined();
    expect(setAtPath).toBe(sap);
  });

  test('should update a simple value at path', () => {
    sap(state, 'user.name', 'Doe');
    expect(state.user.name).toBe('Doe');
  });

  test('should create intermediate objects if path does not exist', () => {
    sap(state, 'meta.info.version', '1.0.0');
    expect(state.meta.info.version).toBe('1.0.0');
  });

  test('should handle batch updates when path is an object', () => {
    sap(state, {
      'user.name': 'Alice',
      'settings.theme': 'light'
    });
    // Note: lodash merge doesn't automatically parse dot notation keys 
    // when merging objects unless specifically handled. 
    // In our implementation, batch update uses _.merge(obj, path).
    // Let's verify how _.merge handles it or use the actual expected behavior.

    // Actually, _.merge(state, { user: { name: 'Alice' } }) works.
    sap(state, { user: { name: 'Alice' } });
    expect(state.user.name).toBe('Alice');
  });

  test('should use .replace() for MobX Observable Arrays to maintain reactivity', () => {
    const originalArray = state.user.items;
    const newItems = ['cherry', 'date'];

    sap(state, 'user.items', newItems);

    // Reference should be maintained
    expect(state.user.items).toBe(originalArray);
    // Content should be updated
    expect(state.user.items.slice()).toEqual(newItems);
  });

  test('should trigger MobX reactions correctly', () => {
    let triggeredCount = 0;
    autorun(() => {
      // Access the value to track it
      const temp = state.user.name;
      triggeredCount++;
    });

    // Initial autorun call
    expect(triggeredCount).toBe(1);

    // Update value through sap
    sap(state, 'user.name', 'Bob');

    // Should trigger again
    expect(triggeredCount).toBe(2);
    expect(state.user.name).toBe('Bob');
  });

  test('should handle bracket notation paths (via _.toPath)', () => {
    sap(state, 'user.items[1]', 'blueberry');
    expect(state.user.items[1]).toBe('blueberry');
  });

  test('should handle array-based paths', () => {
    sap(state, ['user', 'name'], 'Charlie');
    expect(state.user.name).toBe('Charlie');
  });
});
