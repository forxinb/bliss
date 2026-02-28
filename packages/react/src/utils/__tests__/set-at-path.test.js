const { makeAutoObservable, autorun, observable } = require('mobx');
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

  describe('Safety & Edge Cases', () => {
    test('should early return if target object is null/undefined', () => {
      expect(() => sap(null, 'any.path', 'value')).not.toThrow();
    });

    test('should block invalid falsy path parts (except 0)', () => {
      const originalName = state.user.name;

      sap(state, null, 'New Name');
      sap(state, [null, 'name'], 'New Name');
      sap(state, undefined, 'New Name');
      sap(state, NaN, 'New Name');
      sap(state, false, 'New Name');
      sap(state, '', 'New Name');

      expect(state.user.name).toBe(originalName);
    });

    test('should allow 0 as a valid path or index', () => {
      state.list = ['a', 'b'];
      sap(state, 'list.0', 'z');
      expect(state.list[0]).toBe('z');

      sap(state, ['list', 1], 'y');
      expect(state.list[1]).toBe('y');
    });

    test('should overwrite existing non-object values (0, false, "") to create intermediate objects (consistent with _.set)', () => {
      state.meta = false; // Existing non-object value
      sap(state, 'meta.deep.key', 'value');

      // Should now be an object structure following _.set behavior
      expect(state.meta.deep.key).toBe('value');
    });

    test('should automatically create an array (not object) for missing paths with numeric indices', () => {
      delete state.items; // Ensure it doesn't exist
      sap(state, 'items[0]', 'first');

      expect(Array.isArray(state.items)).toBe(true);
      expect(state.items[0]).toBe('first');
    });

    test('should perform a deep merge in Batch Update mode (preserving existing keys)', () => {
      // state.user already has 'name' and 'items'
      sap(state, { user: { age: 25 } });

      expect(state.user.age).toBe(25);
      expect(state.user.name).toBe('John'); // Should still exist
      expect(state.user.items.length).toBeGreaterThan(0);
    });

    test('should handle deep nested Observable Array replacement', () => {
      state.nested = { data: { list: observable(['old']) } };
      const originalList = state.nested.data.list;

      sap(state, 'nested.data.list', ['new']);

      expect(state.nested.data.list).toBe(originalList); // Reference equality
      expect(state.nested.data.list[0]).toBe('new');
    });

    test('should allow setting 0 or empty string as the final value', () => {
      sap(state, 'user.name', '');
      expect(state.user.name).toBe('');

      sap(state, 'count', 0);
      expect(state.count).toBe(0);
    });

    test('should support literal "-1" string as a key in plain objects', () => {
      const plainObj = {};
      sap(plainObj, '-1', 'special value');
      expect(plainObj['-1']).toBe('special value');
    });
  });
});
