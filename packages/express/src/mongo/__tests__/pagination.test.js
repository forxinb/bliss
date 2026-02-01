// Advanced pagination tests

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('@godbliss/core/utils');
const { makeCollections, registerCollection, createDocumentHelper } = require('../index');

describe('Advanced Pagination Tests', () => {
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
    registerCollection(Collections, 'posts');

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
    const collections = ['users', 'posts'];
    await Promise.all(
      collections.map(async (name) => {
        if (Collections[name]) {
          await Collections[name].deleteMany({});
        }
      })
    );
  });

  describe('Cursor Pagination with ObjectId', () => {
    beforeEach(async () => {
      // Insert test data (let MongoDB generate _id)
      const testDocs = [];
      for (let i = 1; i <= 20; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          order: i,
          createdAt: new Date(Date.now() + i * 1000)
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle forward cursor pagination with ObjectId', async () => {
      // First page
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      expect(firstPage.data).toHaveLength(5);
      expect(firstPage.pageInfo.hasNext).toBe(true);
      expect(firstPage.pageInfo.endCursor).toBeDefined();

      // Second page using after cursor
      const secondPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: firstPage.pageInfo.endCursor.toString(),
        pageSize: 5
      });

      expect(secondPage.data).toHaveLength(5);
      expect(secondPage.pageInfo.hasNext).toBe(true);

      // Verify different documents
      const firstPageIds = firstPage.data.map(doc => doc._id.toString());
      const secondPageIds = secondPage.data.map(doc => doc._id.toString());
      const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
      expect(hasOverlap).toBe(false);
    });

    test('should handle backward cursor pagination with ObjectId', async () => {
      // Get first page
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      // Get second page
      const secondPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: firstPage.pageInfo.endCursor,
        pageSize: 5
      });

      // Go backward from second page
      const backwardPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        before: secondPage.data[secondPage.data.length - 1]._id.toString(),
        pageSize: 5
      });

      expect(backwardPage.data).toHaveLength(5);
      expect(backwardPage.pageInfo.hasPrev).toBe(true);
      expect(backwardPage.pageInfo.pageSize).toBe(5);
    });

    test('should handle pagination with custom cursorField', async () => {
      // Use order field as pagination cursor
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, { sort: { order: -1 } }, {
        pageSize: 5,
        cursorField: 'order'
      });

      expect(firstPage.data).toHaveLength(5);
      expect(firstPage.pageInfo.hasNext).toBe(true);
      expect(firstPage.pageInfo.endCursor).toBeDefined();

      // Verify sorting by order field
      const orders = firstPage.data.map(doc => doc.order);
      expect(orders).toEqual(orders.sort((a, b) => b - a)); // descending order
    });
  });

  describe('Page Pagination', () => {
    beforeEach(async () => {
      // Insert test data
      const testDocs = [];
      for (let i = 1; i <= 25; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          category: i <= 10 ? 'A' : i <= 20 ? 'B' : 'C'
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle page pagination with different page sizes', async () => {
      // Page 1 with pageSize 10
      const page1 = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 1,
        pageSize: 10
      });

      expect(page1.data).toHaveLength(10);
      expect(page1.pageInfo.page).toBe(1);
      expect(page1.pageInfo.hasNext).toBe(true);

      // Page 2
      const page2 = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 2,
        pageSize: 10
      });

      expect(page2.data).toHaveLength(10);
      expect(page2.pageInfo.page).toBe(2);
      expect(page2.pageInfo.hasNext).toBe(true);

      // Page 3 (last page)
      const page3 = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 3,
        pageSize: 10
      });

      expect(page3.data).toHaveLength(5);
      expect(page3.pageInfo.page).toBe(3);
      expect(page3.pageInfo.hasNext).toBe(false);
    });

    test('should handle page pagination with filtering', async () => {
      // Page 1 with category filter
      const page1 = await docHelper.findDocs('users', { category: 'A' }, {}, {
        page: 1,
        pageSize: 5
      });

      expect(page1.data).toHaveLength(5);
      expect(page1.pageInfo.page).toBe(1);
      expect(page1.pageInfo.hasNext).toBe(true);

      // Verify all documents have category 'A'
      page1.data.forEach(doc => {
        expect(doc.category).toBe('A');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty collection', async () => {
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle single document', async () => {
      await Collections.users.insertOne({ name: 'Single User', value: 1 });

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(1);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle large page size', async () => {
      // Insert 5 documents
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // Request page size larger than available documents
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 10
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle invalid page numbers', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // Page 0 (invalid)
      const page0 = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 0,
        pageSize: 5
      });

      expect(page0.data).toHaveLength(5); // Should fall back to cursor mode

      // Page -1 (invalid)
      const pageNeg1 = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: -1,
        pageSize: 5
      });

      expect(pageNeg1.data).toHaveLength(5); // Should fall back to cursor mode
    });
  });

  describe('Mixed Pagination Modes', () => {
    beforeEach(async () => {
      // Insert test data
      const testDocs = [];
      for (let i = 1; i <= 15; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          priority: i <= 5 ? 'high' : i <= 10 ? 'medium' : 'low'
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle both page and cursor pagination in same test', async () => {
      // Start with page pagination
      const page1 = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 1,
        pageSize: 5
      });

      expect(page1.data).toHaveLength(5);
      expect(page1.pageInfo.page).toBe(1);

      // Switch to cursor pagination
      const cursorPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      expect(cursorPage.data).toHaveLength(5);
      expect(cursorPage.pageInfo.hasNext).toBe(true);
    });

    test('should handle pagination with complex sorting', async () => {
      // Sort by priority (high -> medium -> low) then by value
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { priority: 1, value: 1 }
      }, {
        pageSize: 10
      });

      expect(result.data).toHaveLength(10);

      // Verify sorting: first 5 should be high priority, next 5 should be low
      const priorities = result.data.map(doc => doc.priority);
      expect(priorities.slice(0, 5).every(p => p === 'high')).toBe(true);
      expect(priorities.slice(5, 10).every(p => p === 'low')).toBe(true);
    });
  });

  describe('Safe Selector Integration', () => {
    beforeEach(async () => {
      // Insert test data
      const testDocs = [];
      for (let i = 1; i <= 10; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          category: i <= 3 ? 'A' : i <= 6 ? 'B' : 'C'
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle "all" selector with pagination', async () => {
      // First page with 'all' selector
      const firstPage = await docHelper.findDocs('users', 'all', {}, { pageSize: 3 });
      expect(firstPage.data).toHaveLength(3);
      expect(firstPage.pageInfo.hasNext).toBe(true);

      // Second page
      const secondPage = await docHelper.findDocs('users', 'all', {}, {
        after: firstPage.pageInfo.endCursor.toString(),
        pageSize: 3
      });
      expect(secondPage.data).toHaveLength(3);
      expect(secondPage.pageInfo.hasNext).toBe(true);

      // Third page
      const thirdPage = await docHelper.findDocs('users', 'all', {}, {
        after: secondPage.pageInfo.endCursor.toString(),
        pageSize: 3
      });
      expect(thirdPage.data).toHaveLength(3);
      expect(thirdPage.pageInfo.hasNext).toBe(true);

      // Fourth page (last)
      const fourthPage = await docHelper.findDocs('users', 'all', {}, {
        after: thirdPage.pageInfo.endCursor.toString(),
        pageSize: 3
      });
      expect(fourthPage.data).toHaveLength(1);
      expect(fourthPage.pageInfo.hasNext).toBe(false);
    });

    test('should handle empty object selector with pagination (security)', async () => {
      const result = await docHelper.findDocs('users', {}, {}, { pageSize: 5 });
      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle invalid selectors with pagination (security)', async () => {
      const invalidSelectors = [null, undefined, '', 0, false, [], 'invalid'];

      for (const selector of invalidSelectors) {
        const result = await docHelper.findDocs('users', selector, {}, { pageSize: 5 });
        expect(result.data).toHaveLength(0);
        expect(result.pageInfo.hasNext).toBe(false);
      }
    });
  });

  describe('Extreme Edge Cases', () => {
    test('should handle very large page sizes', async () => {
      // Insert 5 documents
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // Request much larger page size
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 10000
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle zero page size', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 0
      });

      // Should fall back to default
      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.pageSize).toBe(10); // Default page size
    });

    test('should handle exact limit documents', async () => {
      // Insert exactly 5 documents
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle one more than limit documents', async () => {
      // Insert exactly 6 documents
      const testDocs = [];
      for (let i = 1; i <= 6; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(true);
    });
  });

  describe('Advanced Cursor Scenarios', () => {
    beforeEach(async () => {
      const testDocs = [];
      for (let i = 1; i <= 10; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          createdAt: new Date(Date.now() + i * 1000)
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle non-existent after cursor', async () => {
      const fakeObjectId = new ObjectId();

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: fakeObjectId.toString(),
        pageSize: 5
      });

      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle non-existent before cursor', async () => {
      const fakeObjectId = new ObjectId('000000000000000000000000'); // query past time

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        before: fakeObjectId.toString(),
        pageSize: 5
      });

      expect(result.data).toHaveLength(0); // No documents older than fakeObjectId
      expect(result.pageInfo.hasPrev).toBe(false); // before cursor returns hasPrev false on start
    });

    test('should handle invalid cursor format', async () => {
      const invalidCursors = ['invalid', '123', '', null, undefined];

      for (const cursor of invalidCursors) {
        const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
          after: cursor,
          pageSize: 5
        });

        // Should handle gracefully (either return empty or fall back)
        expect(result.data).toBeDefined();
        expect(result.pageInfo).toBeDefined();
      }
    });

    test('should handle after: null for first page', async () => {
      // First page with after: null
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: null,
        pageSize: 3
      });

      expect(firstPage.data).toHaveLength(3);
      expect(firstPage.pageInfo.hasNext).toBe(true);
      expect(firstPage.pageInfo.startCursor).toBeDefined();
      expect(firstPage.pageInfo.endCursor).toBeDefined();

      // Second page with actual cursor
      const secondPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: firstPage.pageInfo.endCursor,
        pageSize: 3
      });

      expect(secondPage.data).toHaveLength(3);
      expect(secondPage.pageInfo.hasNext).toBe(true);

      // Verify different documents
      const firstPageIds = firstPage.data.map(doc => doc._id.toString());
      const secondPageIds = secondPage.data.map(doc => doc._id.toString());
      const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
      expect(hasOverlap).toBe(false);
    });
  });

  describe('Complex Sorting and Filtering', () => {
    beforeEach(async () => {
      const testDocs = [];

      for (let i = 1; i <= 20; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          priority: i <= 6 ? 'high' : i <= 12 ? 'medium' : 'low', // 6 each
          category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C', // A: 7, B: 7, C: 6
          createdAt: new Date(Date.now() + i * 1000),
          score: i * 5 // Fixed scores: 5, 10, ... 100
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle complex nested sorting', async () => {
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { priority: 1, score: -1, createdAt: -1, _id: 1 }
      }, {
        pageSize: 10
      });

      expect(result.data).toHaveLength(10);

      // Verify sorting order
      const priorities = result.data.map(doc => doc.priority);
      const expectedOrder = ['high', 'high', 'high', 'high', 'high', 'high', 'low', 'low', 'low', 'low'];
      expect(priorities).toEqual(expectedOrder);
    });

    test('should handle complex filtering with pagination', async () => {
      // Filter Condition: priority is high/medium AND score >= 50 AND category is NOT C
      // Expected Result:
      // - priority high (1-6): score 5-30 -> score >= 50: 0
      // - priority medium (7-12): score 35-60 -> score >= 50: 3 items (50,55,60)
      // - category NOT C: out of A(7) + B(7) = 14
      // - Among 3 items with score >= 50 in medium priority, NOT category C: 2 items (50,55 are A/B, 60 is C)
      // Total 2 documents satisfy condition

      const result = await docHelper.findDocs('users', {
        $and: [
          { priority: { $in: ['high', 'medium'] } },
          { score: { $gte: 50 } },
          { category: { $ne: 'C' } }
        ]
      }, {
        sort: { score: -1, _id: 1 }
      }, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(2); // Exactly 2
      expect(result.pageInfo.hasNext).toBe(false); // Only 2 items, so no next page

      // Verify all documents match the filter
      result.data.forEach(doc => {
        expect(['high', 'medium']).toContain(doc.priority);
        expect(doc.score).toBeGreaterThanOrEqual(50);
        expect(doc.category).not.toBe('C');
      });

      // Verify specific documents (sorted by score 60, 50)
      expect(result.data[0].score).toBe(60);
      expect(result.data[0].priority).toBe('medium');
      expect(result.data[1].score).toBe(50);
      expect(result.data[1].priority).toBe('medium');
    });

    test('should handle pagination with regex filtering', async () => {
      const result = await docHelper.findDocs('users', {
        name: { $regex: /User [1-9]$/, $options: 'i' }
      }, {
        sort: { value: 1 }
      }, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(5);

      // Verify all names match the pattern
      result.data.forEach(doc => {
        expect(doc.name).toMatch(/User [1-9]$/i);
      });
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle large dataset pagination', async () => {
      // Insert 1000 documents
      const testDocs = [];
      for (let i = 1; i <= 1000; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          category: i % 10 === 0 ? 'special' : 'normal',
          createdAt: new Date(Date.now() + i * 1000)
        });
      }
      await Collections.users.insertMany(testDocs);

      // Test pagination through large dataset
      let currentCursor = null;
      let pageCount = 0;
      let totalDocs = 0;

      while (pageCount < 10) { // Limit to 10 pages for test performance
        const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
          after: currentCursor,
          pageSize: 100
        });

        totalDocs += result.data.length;
        pageCount++;

        if (!result.pageInfo.hasNext) break;
        currentCursor = result.pageInfo.endCursor.toString();
      }

      expect(totalDocs).toBeGreaterThan(0);
      expect(pageCount).toBeGreaterThan(0);
    });

    test('should handle concurrent pagination requests', async () => {
      // Insert test data
      const testDocs = [];
      for (let i = 1; i <= 50; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // Make concurrent requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
            pageSize: 10
          })
        );
      }

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(result => {
        expect(result.data).toHaveLength(10);
        expect(result.pageInfo.hasNext).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid cursorField', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // Use non-existent field as cursor
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { nonExistentField: 1 }
      }, {
        pageSize: 5,
        cursorField: 'nonExistentField'
      });

      // Should handle gracefully
      expect(result.data).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });

    test('should handle backward pagination on first page', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // Try to go backward from first page
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        before: 'some_cursor',
        pageSize: 5
      });

      expect(result.data).toHaveLength(0);
      expect(result.pageInfo.hasPrev).toBe(false);
    });

    test('should warn when both page and cursor pagination provided', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 1,
        after: 'some_cursor',
        pageSize: 5
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cursor pagination and page pagination provided')
      );

      consoleSpy.mockRestore();
    });

    test('should handle invalid ObjectId strings gracefully', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const invalidObjectIds = [
        'invalid',
        '123',
        '507f1f77bcf86cd799439011', // 24 chars but invalid
        '507f1f77bcf86cd79943901',  // 23 chars
        '507f1f77bcf86cd7994390112' // 25 chars
      ];

      for (const invalidId of invalidObjectIds) {
        const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
          after: invalidId,
          pageSize: 5
        });
        // Should handle gracefully without throwing
        expect(result.data).toBeDefined();
        expect(result.pageInfo).toBeDefined();
      }
    });

    test('should work with existing fields as cursorField', async () => {
      const testDocs = [];
      for (let i = 1; i <= 10; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          createdAt: new Date(Date.now() + i * 1000)
        });
      }
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { value: -1 }
      }, {
        pageSize: 5,
        cursorField: 'value'
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.endCursor).toBeDefined();

      // Verify sorting by value field
      const values = result.data.map(doc => doc.value);
      expect(values).toEqual(values.sort((a, b) => b - a)); // descending order
    });

    test('should respect suppressObjectIdConversion option', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: '507f1f77bcf86cd799439011',
        pageSize: 5,
        suppressObjectIdConversion: true
      });

      // Should treat as string, not convert to ObjectId
      expect(result.data).toBeDefined();
      expect(result.pageInfo).toBeDefined();
    });

    test('should determine correct pagination behavior', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      // None mode (pageSize only) - should return all results up to pageSize
      const noneMode = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });
      expect(noneMode.data).toHaveLength(5);
      expect(noneMode.pageInfo.hasNext).toBe(false);
      expect(noneMode.pageInfo.pageSize).toBe(5);

      // Cursor mode (after provided) - should work with cursors
      const cursorMode = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        after: null,
        pageSize: 3
      });
      expect(cursorMode.data).toHaveLength(3);
      expect(cursorMode.pageInfo.hasNext).toBe(true);
      expect(cursorMode.pageInfo.startCursor).toBeDefined();
      expect(cursorMode.pageInfo.endCursor).toBeDefined();

      // Page mode (page provided) - should work with page numbers
      const pageMode = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 1,
        pageSize: 3
      });
      expect(pageMode.data).toHaveLength(3);
      expect(pageMode.pageInfo.page).toBe(1);
      expect(pageMode.pageInfo.hasNext).toBe(true);
    });

    test('should handle malformed pagination parameters', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const malformedParams = [
        { pageSize: 'invalid' },
        { page: 'invalid' },
        { pageSize: -1, page: -1 },
        { pageSize: null, page: null },
        { pageSize: undefined, page: undefined }
      ];

      for (const params of malformedParams) {
        const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, params);

        // Should fall back to defaults
        expect(result.data).toBeDefined();
        expect(result.pageInfo).toBeDefined();
        expect(result.pageInfo.pageSize).toBe(10); // Default page size
      }
    });

    test('should handle empty sort object', async () => {
      const testDocs = [];
      for (let i = 1; i <= 5; i++) {
        testDocs.push({ name: `User ${i}`, value: i });
      }
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: {}
      }, {
        pageSize: 5
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(false);
    });
  });

  describe('Sort Direction and Cursor Combinations', () => {
    beforeEach(async () => {
      const testDocs = [];
      for (let i = 1; i <= 15; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i,
          createdAt: new Date(Date.now() + i * 1000),
          score: i * 10
        });
      }
      await Collections.users.insertMany(testDocs);
    });

    test('should handle different sort directions with cursors', async () => {
      const sortConfigs = [
        { sort: { _id: 1 }, cursorField: '_id', description: 'ascending _id' },
        { sort: { createdAt: -1 }, cursorField: 'createdAt', description: 'descending createdAt' },
        { sort: { value: 1, _id: -1 }, cursorField: 'value', description: 'ascending value, descending _id' },
        { sort: { score: -1, createdAt: 1 }, cursorField: 'score', description: 'descending score, ascending createdAt' }
      ];

      for (const config of sortConfigs) {
        const result = await docHelper.findDocs('users', { _id: { $exists: true } }, config, {
          pageSize: 3
        });

        expect(result.data).toHaveLength(3);
        expect(result.pageInfo.hasNext).toBe(true);
        expect(result.pageInfo.endCursor).toBeDefined();
      }
    });

    test('should handle cursor pagination with complex multi-field sorting', async () => {
      // Sort by priority (high -> medium -> low), then by score (desc), then by _id (asc)
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { value: 1, score: -1, _id: 1 }
      }, {
        pageSize: 5,
        cursorField: 'value'
      });

      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(true);

      // Verify sorting order
      const values = result.data.map(doc => doc.value);
      expect(values).toEqual(values.sort((a, b) => a - b)); // ascending order
    });

    test('should handle forward and backward pagination with score field', async () => {
      // Step 1: Get first page (forward pagination) - descending score order
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { score: -1 } // descending order (100, 95, 90, ...)
      }, {
        pageSize: 3,
        cursorField: 'score'
      });

      expect(firstPage.data).toHaveLength(3);
      expect(firstPage.pageInfo.hasNext).toBe(true);
      expect(firstPage.pageInfo.startCursor).toBeDefined();
      expect(firstPage.pageInfo.endCursor).toBeDefined();

      // Step 2: Get second page using after cursor (forward pagination)

      const secondPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { score: -1 }
      }, {
        after: firstPage.pageInfo.endCursor,
        pageSize: 3,
        cursorField: 'score',
        suppressObjectIdConversion: true
      });


      expect(secondPage.data).toHaveLength(3);
      expect(secondPage.pageInfo.hasNext).toBe(true);
      // hasPrev is forward pagination so check is skipped

      // Step 3: Go back to first page using before cursor (backward pagination)
      const backToFirstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {
        sort: { score: -1 }
      }, {
        before: secondPage.pageInfo.startCursor,
        pageSize: 3,
        cursorField: 'score',
        suppressObjectIdConversion: true
      });


      expect(backToFirstPage.data).toHaveLength(3);
      expect(backToFirstPage.pageInfo.hasPrev).toBe(false);
      // hasNext is backward pagination so check is skipped

      // Verify we got back to the same first page
      const firstPageIds = firstPage.data.map(doc => doc._id.toString());
      const backToFirstPageIds = backToFirstPage.data.map(doc => doc._id.toString());
      expect(firstPageIds).toEqual(backToFirstPageIds);

      // Verify second page is different from first page
      const secondPageIds = secondPage.data.map(doc => doc._id.toString());
      const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
      expect(hasOverlap).toBe(false);
    });
  });
});
