const { ObjectId } = require('@godbliss/core/utils');
const { createFieldStates } = require('../use-schema-validations');
const { simpleForm, nestedForm, complexForm } = require('../__mocks__/mock-form');

describe('createFieldStates', () => {
  describe('Basic functionality', () => {
    test('should create field states for simple flat object', () => {
      const form = { name: 'John', age: 30, active: true };
      const result = createFieldStates(form);

      expect(result).toEqual({
        'name': {
          hasUpdatedAfterRender: false,
          initialValue: 'John'
        },
        'age': {
          hasUpdatedAfterRender: false,
          initialValue: 30
        },
        'active': {
          hasUpdatedAfterRender: false,
          initialValue: true
        }
      });
    });

    test('should handle empty object', () => {
      const result = createFieldStates({});
      expect(result).toEqual({});
    });

    test('should handle null and undefined values', () => {
      const form = { 
        nullValue: null, 
        undefinedValue: undefined,
        emptyString: '',
        zeroNumber: 0,
        falseBool: false
      };
      
      const result = createFieldStates(form);
      
      expect(result).toEqual({
        'nullValue': { hasUpdatedAfterRender: false, initialValue: null },
        'undefinedValue': { hasUpdatedAfterRender: false, initialValue: undefined },
        'emptyString': { hasUpdatedAfterRender: false, initialValue: '' },
        'zeroNumber': { hasUpdatedAfterRender: false, initialValue: 0 },
        'falseBool': { hasUpdatedAfterRender: false, initialValue: false }
      });
    });
  });

  describe('Nested object handling', () => {
    test('should create dot-notation paths for nested objects', () => {
      const form = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            bio: 'Developer'
          }
        }
      };

      const result = createFieldStates(form);

      expect(result).toEqual({
        'user.name': { hasUpdatedAfterRender: false, initialValue: 'John' },
        'user.profile.age': { hasUpdatedAfterRender: false, initialValue: 30 },
        'user.profile.bio': { hasUpdatedAfterRender: false, initialValue: 'Developer' }
      });
    });

    test('should handle mixed nested and flat properties', () => {
      const form = {
        title: 'Test',
        user: {
          name: 'John'
        },
        count: 5
      };

      const result = createFieldStates(form);

      expect(result).toEqual({
        'title': { hasUpdatedAfterRender: false, initialValue: 'Test' },
        'user.name': { hasUpdatedAfterRender: false, initialValue: 'John' },
        'count': { hasUpdatedAfterRender: false, initialValue: 5 }
      });
    });
  });

  describe('Array and ObjectId handling', () => {
    test('should include arrays in field states', () => {
      const form = {
        name: 'John',
        tags: ['tag1', 'tag2', 'tag3'],
        items: [{ id: 1 }, { id: 2 }],
        count: 5
      };

      const result = createFieldStates(form);

      expect(result).toEqual({
        'name': { hasUpdatedAfterRender: false, initialValue: 'John' },
        'tags': { hasUpdatedAfterRender: false, initialValue: ['tag1', 'tag2', 'tag3'] },
        'items': { hasUpdatedAfterRender: false, initialValue: [{ id: 1 }, { id: 2 }] },
        'count': { hasUpdatedAfterRender: false, initialValue: 5 }
      });
      
      // Arrays should be included
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('items');
    });

    test('should include ObjectId instances', () => {
      const objectId = new ObjectId();
      const form = {
        _id: objectId,
        name: 'John',
        userId: objectId
      };

      const result = createFieldStates(form);

      expect(result).toEqual({
        '_id': { hasUpdatedAfterRender: false, initialValue: objectId },
        'name': { hasUpdatedAfterRender: false, initialValue: 'John' },
        'userId': { hasUpdatedAfterRender: false, initialValue: objectId }
      });
      
      // ObjectId fields should be included
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('userId');
    });

    test('should handle complex form with mixed types', () => {
      const result = createFieldStates(complexForm);

      // Should include primitive values and nested objects
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty(['metadata.createdAt']);
      expect(result).toHaveProperty(['metadata.updatedAt']);
      
      // Should include ObjectId and arrays
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('items');
    });

    test('should handle all data types comprehensively', () => {
      const objectId = new ObjectId();
      const date = new Date('2023-01-01');
      
      const form = {
        // Primitives (should be included)
        user: {
          name: 'John',              // string
          age: 30,                   // number  
          active: true,              // boolean
          nullValue: null,           // null
          undefinedValue: undefined  // undefined
        },
        
        // Should be excluded
        tags: ['tag1', 'tag2'],      // array
        items: [{ id: 1 }, { id: 2 }], // array with objects
        _id: objectId,               // ObjectId
        userId: objectId,            // ObjectId
        method: () => {},            // function
        arrow: function() { return 'test'; }, // function
        
        // Should be included  
        createdAt: date,             // Date
        count: 0,                    // number (falsy)
        emptyString: '',             // string (falsy)
        falseBool: false             // boolean (falsy)
      };

      const result = createFieldStates(form);

      // Should include primitives and nested primitives
      expect(result).toHaveProperty(['user.name']);
      expect(result).toHaveProperty(['user.age']);
      expect(result).toHaveProperty(['user.active']);
      expect(result).toHaveProperty(['user.nullValue']);
      expect(result).toHaveProperty(['user.undefinedValue']);
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('emptyString');
      expect(result).toHaveProperty('falseBool');

      // Should include arrays and ObjectIds, but exclude functions
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('_id');
      expect(result).toHaveProperty('userId');
      expect(result).not.toHaveProperty('method');
      expect(result).not.toHaveProperty('arrow');

      // Verify actual values
      expect(result['user.name'].initialValue).toBe('John');
      expect(result['user.age'].initialValue).toBe(30);
      expect(result['user.active'].initialValue).toBe(true);
      expect(result['user.nullValue'].initialValue).toBe(null);
      expect(result['user.undefinedValue'].initialValue).toBe(undefined);
      expect(result['createdAt'].initialValue).toBe(date);
      expect(result['count'].initialValue).toBe(0);
      expect(result['emptyString'].initialValue).toBe('');
      expect(result['falseBool'].initialValue).toBe(false);
      expect(result['tags'].initialValue).toEqual(['tag1', 'tag2']);
      expect(result['items'].initialValue).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result['_id'].initialValue).toBe(objectId);
      expect(result['userId'].initialValue).toBe(objectId);
    });
  });

  describe('Edge cases', () => {
    test('should handle deeply nested objects', () => {
      const form = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      };

      const result = createFieldStates(form);

      expect(result).toEqual({
        'level1.level2.level3.level4.value': {
          hasUpdatedAfterRender: false,
          initialValue: 'deep'
        }
      });
    });

    test('should handle objects with function properties (should be excluded)', () => {
      const form = {
        name: 'John',
        method: function() { return 'test'; },
        arrow: () => 'arrow',
        value: 42
      };

      const result = createFieldStates(form);

      // Functions are objects in JavaScript, so they should be excluded
      expect(result).toEqual({
        'name': { hasUpdatedAfterRender: false, initialValue: 'John' },
        'value': { hasUpdatedAfterRender: false, initialValue: 42 }
      });
      
      expect(result).not.toHaveProperty('method');
      expect(result).not.toHaveProperty('arrow');
    });

    test('should handle Date objects', () => {
      const date = new Date('2023-01-01');
      const form = {
        name: 'John',
        createdAt: date
      };

      const result = createFieldStates(form);

      expect(result).toEqual({
        'name': { hasUpdatedAfterRender: false, initialValue: 'John' },
        'createdAt': { hasUpdatedAfterRender: false, initialValue: date }
      });
    });
  });

  describe('Real-world scenarios', () => {
    test('should work with typical user form', () => {
      const result = createFieldStates(simpleForm);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('age');
      
      Object.values(result).forEach(fieldState => {
        expect(fieldState).toHaveProperty('hasUpdatedAfterRender', false);
        expect(fieldState).toHaveProperty('initialValue');
      });
    });

    test('should work with nested user profile form', () => {
      const result = createFieldStates(nestedForm);

      expect(result).toHaveProperty(['user.name']);
      expect(result).toHaveProperty(['user.profile.age']);
      expect(result).toHaveProperty(['user.profile.bio']);
      expect(result).toHaveProperty(['settings.theme']);
      expect(result).toHaveProperty(['settings.notifications']);
    });
  });
});
