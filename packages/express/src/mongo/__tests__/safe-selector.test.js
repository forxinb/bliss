const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('@godbliss/core/utils');
const { makeCollections, registerCollection, createDocumentHelper } = require('../index');

/**
 * Safe Selector Tests
 * 
 * Tests the getSafeSelector function and 'all' selector functionality.
 * 
 * Key concepts:
 * - getSafeSelector prevents accidental full collection scans by rejecting empty selectors
 * - 'all' selector provides explicit way to query entire collection
 * - getSafeSelector only validates selector structure (empty vs non-empty, plain object vs other types)
 * - MongoDB operator validity is NOT validated by getSafeSelector (handled by MongoDB)
 */
describe('Safe Selector Tests', () => {
  let mongoServer;
  let client;
  let db;
  let Collections;
  let docHelper;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    Collections = makeCollections({ db });
    
    // Register collections
    registerCollection(Collections, 'users');
    registerCollection(Collections, 'products');
    
    // Create document helper
    docHelper = createDocumentHelper({ Collections });
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear collections before each test
    const collections = ['users', 'products'];
    await Promise.all(
      collections.map(async (name) => {
        if (Collections[name]) {
          await Collections[name].deleteMany({});
        }
      })
    );
  });

  describe('getSafeSelector behavior', () => {
    test('should handle "all" selector for full collection query', async () => {
      // Insert test data
      await docHelper.insertDoc('users', { name: 'John', age: 25 });
      await docHelper.insertDoc('users', { name: 'Jane', age: 30 });
      await docHelper.insertDoc('users', { name: 'Bob', age: 35 });

      // Test 'all' selector
      const result = await docHelper.findDocs('users', 'all', {}, { pageSize: 10 });
      
      expect(result.data).toHaveLength(3);
      expect(result.pageInfo.hasNext).toBe(false);
      expect(result.pageInfo.startCursor).toBeDefined();
      expect(result.pageInfo.endCursor).toBeDefined();
    });

    test('should return no results for empty object selector (security)', async () => {
      // Insert test data
      await docHelper.insertDoc('users', { name: 'John', age: 25 });
      await docHelper.insertDoc('users', { name: 'Jane', age: 30 });

      // Test empty object selector
      const result = await docHelper.findDocs('users', {}, {}, { pageSize: 10 });
      
      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should return no results for invalid selectors (security)', async () => {
      // Insert test data
      await docHelper.insertDoc('users', { name: 'John', age: 25 });

      // Test various invalid selectors (structure-based validation only)
      const invalidSelectors = [
        null,
        undefined,
        '',
        0,
        false,
        [],
        'invalid',
        123
      ];

      for (const selector of invalidSelectors) {
        const result = await docHelper.findDocs('users', selector, {}, { pageSize: 10 });
        expect(result.data).toHaveLength(0);
      }
    });

    test('should work with valid selectors', async () => {
      // Insert test data
      await docHelper.insertDoc('users', { name: 'John', age: 25 });
      await docHelper.insertDoc('users', { name: 'Jane', age: 30 });
      await docHelper.insertDoc('users', { name: 'Bob', age: 35 });

      // Test valid selectors
      const nameResult = await docHelper.findDocs('users', { name: 'John' }, {}, { pageSize: 10 });
      expect(nameResult.data).toHaveLength(1);
      expect(nameResult.data[0].name).toBe('John');

      const ageResult = await docHelper.findDocs('users', { age: { $gte: 30 } }, {}, { pageSize: 10 });
      expect(ageResult.data).toHaveLength(2);

      const complexResult = await docHelper.findDocs('users', { 
        $or: [{ name: 'John' }, { age: { $gte: 30 } }] 
      }, {}, { pageSize: 10 });
      expect(complexResult.data).toHaveLength(3);
    });

    test('should pass through invalid MongoDB operators (MongoDB handles validation)', async () => {
      // Insert test data
      await docHelper.insertDoc('users', { name: 'John', age: 25 });

      // IMPORTANT: getSafeSelector only validates selector structure, NOT MongoDB operator validity
      // - It checks for empty selectors, plain objects vs other types
      // - It does NOT validate MongoDB operators like $invalid, $unknown, etc.
      // - Invalid MongoDB operators will pass through and cause errors at MongoDB query level
      await expect(docHelper.findDocs('users', { $invalid: 'operator' }, {}, { pageSize: 10 }))
        .rejects.toThrow('unknown top level operator');
    });
  });

  describe('pagination with safe selectors', () => {
  beforeEach(async () => {
    // Clear collection first
    await Collections.users.deleteMany({});
    
    // Insert test data for pagination
    const users = [];
    for (let i = 1; i <= 15; i++) {
      users.push({ name: `User${i}`, age: 20 + i, priority: i <= 5 ? 'high' : i <= 10 ? 'medium' : 'low' });
    }
    await Collections.users.insertMany(users);
  });

    test('should paginate with "all" selector', async () => {
      // First page
      const firstPage = await docHelper.findDocs('users', 'all', {}, { pageSize: 5 });
      expect(firstPage.data).toHaveLength(5);
      expect(firstPage.pageInfo.hasNext).toBe(true);

      // Second page
      const secondPage = await docHelper.findDocs('users', 'all', {}, { 
        after: firstPage.pageInfo.endCursor.toString(), 
        pageSize: 5 
      });
      expect(secondPage.data).toHaveLength(5);
      expect(secondPage.pageInfo.hasNext).toBe(true);

      // Third page
      const thirdPage = await docHelper.findDocs('users', 'all', {}, { 
        after: secondPage.pageInfo.endCursor.toString(), 
        pageSize: 5 
      });
      expect(thirdPage.data).toHaveLength(5);
      expect(thirdPage.pageInfo.hasNext).toBe(false);
    });

    test('should not paginate with empty object selector', async () => {
      const result = await docHelper.findDocs('users', {}, {}, { pageSize: 5 });
      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should paginate with valid selectors', async () => {
      // High priority users
      const highPriorityResult = await docHelper.findDocs('users', { priority: 'high' }, {}, { pageSize: 3 });
      expect(highPriorityResult.data).toHaveLength(3);
      expect(highPriorityResult.data.every(user => user.priority === 'high')).toBe(true);
    });
  });

  describe('ObjectId handling', () => {
    test('should handle ObjectId in selectors', async () => {
      // Insert test data
      const user1 = await docHelper.insertDoc('users', { name: 'John', age: 25 });
      const user2 = await docHelper.insertDoc('users', { name: 'Jane', age: 30 });

      // Test ObjectId selector
      const result = await docHelper.findDocs('users', { _id: user1.insertedId }, {}, { pageSize: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John');
    });

    test('should handle ObjectId in pagination cursors', async () => {
      // Insert test data
      const users = [];
      for (let i = 1; i <= 10; i++) {
        users.push({ name: `User${i}`, order: i });
      }
      await Collections.users.insertMany(users);

      // Get first page
      const firstPage = await docHelper.findDocs('users', 'all', {}, { pageSize: 3 });
      expect(firstPage.data).toHaveLength(3);

      // Use ObjectId as cursor
      const secondPage = await docHelper.findDocs('users', 'all', {}, { 
        after: firstPage.pageInfo.endCursor, 
        pageSize: 3 
      });
      expect(secondPage.data).toHaveLength(3);
    });
  });

  describe('error handling', () => {
    test('should handle non-existent collection gracefully', async () => {
      // This should throw an error
      await expect(docHelper.findDocs('nonexistent', 'all', {}, { pageSize: 10 }))
        .rejects.toThrow();
    });

    test('should handle malformed pagination gracefully', async () => {
      await docHelper.insertDoc('users', { name: 'John', age: 25 });

      // Test with invalid pagination
      const result = await docHelper.findDocs('users', 'all', {}, { 
        pageSize: -1,  // Invalid page size
        page: 'invalid'  // Invalid page
      });
      
      // Should fall back to defaults
      expect(result.data).toHaveLength(1);
      expect(result.pageInfo.pageSize).toBe(10); // Default page size
    });
  });

  describe('console warnings', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      if (consoleSpy) {
        consoleSpy.mockRestore();
      }
    });

    test('should warn for empty object selector', async () => {
      await docHelper.findDocs('users', {}, {}, { pageSize: 10 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[getSafeSelector] Invalid selector provided')
      );
    });

    test('should warn for invalid selectors', async () => {
      await docHelper.findDocs('users', 'invalid', {}, { pageSize: 10 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[getSafeSelector] Invalid selector provided')
      );
    });

    test('should not warn for valid selectors', async () => {
      await docHelper.insertDoc('users', { name: 'John', age: 25 });
      await docHelper.findDocs('users', 'all', {}, { pageSize: 10 });
      await docHelper.findDocs('users', { name: 'John' }, {}, { pageSize: 10 });
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle empty collection with "all"', async () => {
      const result = await docHelper.findDocs('users', 'all', {}, { pageSize: 10 });
      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle single document with "all"', async () => {
      await docHelper.insertDoc('users', { name: 'John', age: 25 });
      
      const result = await docHelper.findDocs('users', 'all', {}, { pageSize: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle large page size with "all"', async () => {
      // Insert 5 documents
      const users = [];
      for (let i = 1; i <= 5; i++) {
        users.push({ name: `User${i}`, age: 20 + i });
      }
      await Collections.users.insertMany(users);

      // Request more than available
      const result = await docHelper.findDocs('users', 'all', {}, { pageSize: 100 });
      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(false);
    });
  });
});
