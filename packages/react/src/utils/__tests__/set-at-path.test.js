const { makeAutoObservable, autorun, observable } = require('mobx');
const { setAtPath, sap, patchObj, patchForm } = require('../index');

describe('setAtPath Utility', () => {
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

  test('should export all names and aliases correctly', () => {
    expect(setAtPath).toBeDefined();
    expect(sap).toBe(setAtPath);
    expect(patchObj).toBeDefined();
    expect(patchForm).toBe(patchObj);
  });

  test('should update a simple value at path', () => {
    setAtPath(state, 'user.name', 'Doe');
    expect(state.user.name).toBe('Doe');
  });

  test('should create intermediate objects if path does not exist', () => {
    setAtPath(state, 'meta.info.version', '1.0.0');
    expect(state.meta.info.version).toBe('1.0.0');
  });

  test('should use .replace() for MobX Observable Arrays to maintain reactivity', () => {
    const originalArray = state.user.items;
    const newItems = ['cherry', 'date'];

    setAtPath(state, 'user.items', newItems);

    // Reference should be maintained
    expect(state.user.items).toBe(originalArray);
    // Content should be updated
    expect(state.user.items.slice()).toEqual(newItems);
  });

  test('should trigger MobX reactions correctly', () => {
    let triggeredCount = 0;
    autorun(() => {
      // Access the value to track it
      state.user.name;
      triggeredCount++;
    });

    // Initial autorun call
    expect(triggeredCount).toBe(1);

    // Update value through setAtPath
    setAtPath(state, 'user.name', 'Bob');

    // Should trigger again
    expect(triggeredCount).toBe(2);
    expect(state.user.name).toBe('Bob');
  });

  test('should handle bracket notation paths', () => {
    setAtPath(state, 'user.items[1]', 'blueberry');
    expect(state.user.items[1]).toBe('blueberry');
  });

  test('should handle dot-notation for array indices', () => {
    setAtPath(state, 'user.items.0', 'strawberry');
    expect(state.user.items[0]).toBe('strawberry');
  });

  describe('Safety & Edge Cases', () => {
    test('should early return if target object is null/undefined', () => {
      expect(() => setAtPath(null, 'any.path', 'value')).not.toThrow();
    });

    test('should provide a warning and return if path is not a string (e.g., array or object)', () => {
      const originalName = state.user.name;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      // @ts-ignore
      setAtPath(state, ['user', 'name'], 'New Name');
      // @ts-ignore
      setAtPath(state, { user: { name: 'New Name' } }, 'val');

      expect(state.user.name).toBe(originalName);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("must be a string"), expect.anything());
      warnSpy.mockRestore();
    });

    test('should block invalid or empty path segments', () => {
      const originalName = state.user.name;
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      setAtPath(state, 'user..name', 'Broken');
      setAtPath(state, '', 'Empty');

      expect(state.user.name).toBe(originalName);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid path"));
      warnSpy.mockRestore();
    });

    test('should allow "0" as a valid path segment or index', () => {
      state.list = ['a', 'b'];
      setAtPath(state, 'list.0', 'z');
      expect(state.list[0]).toBe('z');
    });

    test('should overwrite existing non-object values to create paths (consistent with _.set)', () => {
      state.meta = false;
      setAtPath(state, 'meta.deep.key', 'value');
      expect(state.meta.deep.key).toBe('value');
    });

    test('should automatically create an array for missing paths with numeric indices', () => {
      delete state.items;
      setAtPath(state, 'items[0]', 'first');

      expect(Array.isArray(state.items)).toBe(true);
      expect(state.items[0]).toBe('first');
    });

    test('should handle deep nested Observable Array replacement', () => {
      state.nested = { data: { list: observable(['old']) } };
      const originalList = state.nested.data.list;

      setAtPath(state, 'nested.data.list', ['new']);

      expect(state.nested.data.list).toBe(originalList);
      expect(state.nested.data.list[0]).toBe('new');
    });

    test('should allow setting 0 or empty string as the final value', () => {
      setAtPath(state, 'user.name', '');
      expect(state.user.name).toBe('');

      setAtPath(state, 'count', 0);
      expect(state.count).toBe(0);
    });
  });

  describe('patchObj Utility', () => {
    test('should deeply update properties and preserve Observable Array references', () => {
      const originalItems = state.user.items;
      const update = {
        user: {
          name: 'Jane',
          items: ['orange', 'pear']
        },
        settings: { theme: 'light' }
      };

      patchObj(state, update);

      expect(state.user.name).toBe('Jane');
      expect(state.user.items).toBe(originalItems);
      expect(state.user.items.slice()).toEqual(['orange', 'pear']);
      expect(state.settings.theme).toBe('light');
    });

    test('should work via patchForm alias', () => {
      const update = { user: { name: 'Form User' } };
      patchForm(state, update);
      expect(state.user.name).toBe('Form User');
    });

    test('should handle flat maps via dot-notation keys (if supported by traversal)', () => {
      // Note: In our current sop/patchObj, it only traverses plain objects.
      // Dot-notation keys in a patch object are treated as string keys unless expanded.
      // But sap(state, 'a.b', v) handles it. 
      // Current implementation: _.each(patch, (v, k) => ... if !isPlain(v) sap(obj, k, v) ...)
      // So { 'user.name': 'Bob' } will call sap(obj, 'user.name', 'Bob') which WORKS.
      patchObj(state, {
        'user.name': 'Flat Bob',
        'settings.theme': 'ocean'
      });

      expect(state.user.name).toBe('Flat Bob');
      expect(state.settings.theme).toBe('ocean');
    });

    test('should handle deeply nested updates', () => {
      patchObj(state, {
        meta: {
          deep: {
            node: { value: 100 }
          }
        }
      });
      expect(state.meta.deep.node.value).toBe(100);
    });

    test('should warn and return if target is null or patch is not a plain object', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      // @ts-ignore
      patchObj(null, { a: 1 });
      // @ts-ignore
      patchObj(state, [1, 2, 3]);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("must be defined and 'patch' must be a plain object"));
      warnSpy.mockRestore();
    });
  });
});
