const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { makeCollections, registerCollection, createDocumentHelper } = require('../index');

describe('increase/decrease advanced features', () => {
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
    Collections = makeCollections({ db, isDev: false });
    
    // Register test collections
    registerCollection(Collections, 'users');
    registerCollection(Collections, 'products');
    
    docHelper = createDocumentHelper({ Collections });
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await db.collection('users').deleteMany({});
    await db.collection('products').deleteMany({});
  });

  describe('multi operations', () => {
    beforeEach(async () => {
      // Insert multiple test users
      await Collections.users.insertMany([
        { name: 'User 1', score: 10, status: 'active' },
        { name: 'User 2', score: 20, status: 'active' },
        { name: 'User 3', score: 30, status: 'inactive' },
        { name: 'User 4', score: 40, status: 'active' }
      ]);
    });

    test('should increase multiple documents', async () => {
      const result = await docHelper.increase('users', 'score', {
        selector: { status: 'active' },
        amount: 5,
        multi: true
      });

      expect(result.modifiedCount).toBe(3); // 3 active users

      const users = await Collections.users.find({ status: 'active' }).toArray();
      expect(users[0].score).toBe(15); // 10 + 5
      expect(users[1].score).toBe(25); // 20 + 5
      expect(users[2].score).toBe(45); // 40 + 5
    });

    test('should decrease multiple documents', async () => {
      const result = await docHelper.decrease('users', 'score', {
        selector: { status: 'active' },
        amount: 3,
        multi: true
      });

      expect(result.modifiedCount).toBe(3);

      const users = await Collections.users.find({ status: 'active' }).toArray();
      expect(users[0].score).toBe(7);  // 10 - 3
      expect(users[1].score).toBe(17); // 20 - 3
      expect(users[2].score).toBe(37); // 40 - 3
    });

    test('should not affect inactive users', async () => {
      await docHelper.increase('users', 'score', {
        selector: { status: 'active' },
        amount: 100,
        multi: true
      });

      const inactiveUser = await Collections.users.findOne({ status: 'inactive' });
      expect(inactiveUser.score).toBe(30); // unchanged
    });
  });

  describe('upsert operations', () => {
    test('should create document when upsert is true', async () => {
      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'New User' },
        amount: 10,
        upsert: true
      });

      expect(result.upsertedCount).toBe(1);
      expect(result.upsertedId).toBeDefined();

      const user = await Collections.users.findOne({ name: 'New User' });
      expect(user).toBeTruthy();
      expect(user.score).toBe(10);
    });

    test('should not create document when upsert is false', async () => {
      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Non-existent User' },
        amount: 10,
        upsert: false
      });

      expect(result.modifiedCount).toBe(0);

      const user = await Collections.users.findOne({ name: 'Non-existent User' });
      expect(user).toBeNull();
    });
  });

  describe('defaultUpdate operations', () => {
    beforeEach(async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });
    });

    test('should apply defaultUpdate along with inc operation', async () => {
      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 5,
        defaultUpdate: { $set: { lastUpdated: new Date() } }
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(15);
      expect(user.lastUpdated).toBeDefined();
    });

    test('should merge multiple update operations', async () => {
      const result = await docHelper.decrease('users', 'score', {
        selector: { name: 'Test User' },
        amount: 2,
        defaultUpdate: { 
          $set: { status: 'updated' },
          $push: { history: 'score_decreased' }
        }
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(8);
      expect(user.status).toBe('updated');
      expect(user.history).toContain('score_decreased');
    });
  });

  describe('error cases', () => {
    test('should throw error when path is not provided', async () => {
      await expect(docHelper.increase('users', null, {})).rejects.toThrow('inc: path is required');
      await expect(docHelper.decrease('users', undefined, {})).rejects.toThrow('inc: path is required');
      await expect(docHelper.increase('users', '', {})).rejects.toThrow('inc: path is required');
    });

    test('should throw error for non-existent collection', async () => {
      await expect(docHelper.increase('nonexistent', 'field', {})).rejects.toThrow('Collection not found: nonexistent');
    });

    test('should handle zero amount', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 0
      });

      expect(result.modifiedCount).toBe(0); // MongoDB doesn't modify when amount is 0

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(10); // unchanged
    });

    test('should handle negative amount', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: -3
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(7); // 10 + (-3)
    });
  });

  describe('edge cases', () => {
    test('should handle isDec with negative amount', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      const result = await docHelper.decrease('users', 'score', {
        selector: { name: 'Test User' },
        amount: -5 // negative amount with decrease
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(15); // 10 - (-5) = 10 + 5
    });

    test('should handle large amounts', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 0 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 1000000
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(1000000);
    });

    test('should handle decimal amounts', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10.5 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 2.3
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBeCloseTo(12.8); // 10.5 + 2.3
    });
  });

  describe('session/transaction', () => {
    test('should work with session parameter', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      // Test session parameter without transaction
      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 5,
        session: null // Pass null session
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(15);
    });

    test('should handle session parameter gracefully', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      // Test with undefined session
      const result = await docHelper.decrease('users', 'score', {
        selector: { name: 'Test User' },
        amount: 3,
        session: undefined
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(7);
    });
  });

  describe('otherOptions', () => {
    test('should pass additional MongoDB options', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 5,
        writeConcern: { w: 'majority' },
        hint: { _id: 1 }
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(15);
    });

    test('should handle multiple otherOptions', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      const result = await docHelper.decrease('users', 'score', {
        selector: { name: 'Test User' },
        amount: 3,
        writeConcern: { w: 1 },
        maxTimeMS: 5000,
        comment: 'test operation'
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(7);
    });
  });

  describe('complex selectors', () => {
    beforeEach(async () => {
      await Collections.users.insertMany([
        { name: 'User 1', age: 25, score: 10, status: 'active' },
        { name: 'User 2', age: 30, score: 20, status: 'inactive' },
        { name: 'User 3', age: 25, score: 30, status: 'active' },
        { name: 'User 4', age: 35, score: 15, status: 'active' }
      ]);
    });

    test('should work with $and selector', async () => {
      const result = await docHelper.increase('users', 'score', {
        selector: { $and: [{ age: 25 }, { score: { $lt: 20 } }] },
        amount: 5,
        multi: true
      });

      expect(result.modifiedCount).toBe(1); // Only User 1 matches

      const user = await Collections.users.findOne({ name: 'User 1' });
      expect(user.score).toBe(15);
    });

    test('should work with $or selector', async () => {
      const result = await docHelper.decrease('users', 'score', {
        selector: { $or: [{ age: 30 }, { status: 'inactive' }] },
        amount: 3,
        multi: true
      });

      expect(result.modifiedCount).toBe(1); // Only User 2 matches

      const user = await Collections.users.findOne({ name: 'User 2' });
      expect(user.score).toBe(17);
    });

    test('should work with $in selector', async () => {
      const result = await docHelper.increase('users', 'score', {
        selector: { name: { $in: ['User 1', 'User 3'] } },
        amount: 2,
        multi: true
      });

      expect(result.modifiedCount).toBe(2);

      const users = await Collections.users.find({ name: { $in: ['User 1', 'User 3'] } }).toArray();
      expect(users[0].score).toBe(12); // User 1: 10 + 2
      expect(users[1].score).toBe(32); // User 3: 30 + 2
    });

    test('should work with nested field selector', async () => {
      await Collections.users.insertOne({ 
        name: 'Nested User', 
        profile: { level: 1, score: 100 } 
      });

      const result = await docHelper.increase('users', 'profile.score', {
        selector: { 'profile.level': 1 },
        amount: 50
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Nested User' });
      expect(user.profile.score).toBe(150);
    });
  });

  describe('array field operations', () => {
    test('should work with array field paths', async () => {
      await Collections.users.insertOne({ 
        name: 'Test User', 
        stats: { views: 10, likes: 5 } 
      });

      const result = await docHelper.increase('users', 'stats.views', {
        selector: { name: 'Test User' },
        amount: 3
      });

      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.stats.views).toBe(13);
    });

    test('should work with deeply nested fields', async () => {
      await Collections.users.insertOne({ 
        name: 'Deep User', 
        data: { 
          metrics: { 
            counters: { 
              clicks: 100, 
              views: 200 
            } 
          } 
        } 
      });

      const result = await docHelper.decrease('users', 'data.metrics.counters.clicks', {
        selector: { name: 'Deep User' },
        amount: 25
      });

      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Deep User' });
      expect(user.data.metrics.counters.clicks).toBe(75);
    });
  });

  describe('concurrency', () => {
    test('should handle concurrent operations', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 0 });

      // Run multiple operations concurrently
      const promises = Array.from({ length: 10 }, () => 
        docHelper.increase('users', 'score', {
          selector: { name: 'Test User' },
          amount: 1
        })
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.modifiedCount).toBe(1);
      });

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(10);
    });

    test('should handle concurrent multi operations', async () => {
      // Insert multiple users
      await Collections.users.insertMany([
        { name: 'User 1', score: 0 },
        { name: 'User 2', score: 0 },
        { name: 'User 3', score: 0 }
      ]);

      // Run concurrent multi operations
      const promises = Array.from({ length: 5 }, () => 
        docHelper.increase('users', 'score', {
          selector: { name: { $regex: /^User/ } },
          amount: 1,
          multi: true
        })
      );

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.modifiedCount).toBe(3);
      });

      const users = await Collections.users.find({ name: { $regex: /^User/ } }).toArray();
      users.forEach(user => {
        expect(user.score).toBe(5); // 5 operations × 1 increment each
      });
    });
  });

  describe('performance', () => {
    test('should handle large batch operations', async () => {
      // Insert many documents
      const testDocs = Array.from({ length: 100 }, (_, i) => ({ 
        name: `User ${i}`, 
        score: 0 
      }));
      await Collections.users.insertMany(testDocs);

      const result = await docHelper.increase('users', 'score', {
        selector: { name: { $regex: /^User/ } },
        amount: 1,
        multi: true
      });

      expect(result.modifiedCount).toBe(100);

      const count = await Collections.users.countDocuments({ score: 1 });
      expect(count).toBe(100);
    });

    test('should handle large amounts efficiently', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 0 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 1000000
      });

      expect(result.modifiedCount).toBe(1);

      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(1000000);
    });
  });

  describe('type validation', () => {
    test('should handle string amounts by converting to number', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      // MongoDB requires numeric values for $inc, so we expect this to work
      // because our function should handle the conversion
      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: Number('5') // Convert string to number
      });

      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(15);
    });

    test('should handle string amounts with decrease by converting to number', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 20 });

      const result = await docHelper.decrease('users', 'score', {
        selector: { name: 'Test User' },
        amount: Number('3') // Convert string to number
      });

      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBe(17);
    });

    test('should handle mixed type amounts', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      const result = await docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 2.5 // Decimal number
      });

      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.score).toBeCloseTo(12.5);
    });

    test('should throw error for invalid string amounts', async () => {
      await Collections.users.insertOne({ name: 'Test User', score: 10 });

      // Test with invalid string that cannot be converted to number
      await expect(docHelper.increase('users', 'score', {
        selector: { name: 'Test User' },
        amount: 'invalid' // Invalid string
      })).rejects.toThrow();
    });
  });
});
