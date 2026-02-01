const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { withTransaction } = require('../transaction');

describe('withTransaction', () => {
  let mongoReplSet;
  let client;
  let db;

  beforeAll(async () => {
    mongoReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 } // Single member replica set
    });
    const uri = mongoReplSet.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
  });

  afterAll(async () => {
    await client.close();
    await mongoReplSet.stop();
  });

  beforeEach(async () => {
    // Clean up collections before each test
    await db.collection('users').deleteMany({});
    await db.collection('posts').deleteMany({});
  });

  describe('Basic functionality', () => {
    test('should execute transaction successfully', async () => {
      const result = await withTransaction(client, async ({ session, db }) => {
        const users = db.collection('users');
        const posts = db.collection('posts');
        
        await users.insertOne({ name: 'John' }, { session });
        await posts.insertOne({ title: 'Hello' }, { session });
        
        return { success: true, count: 2 };
      });

      expect(result).toEqual({ success: true, count: 2 });
      
      // Verify data was committed
      const userCount = await db.collection('users').countDocuments();
      const postCount = await db.collection('posts').countDocuments();
      expect(userCount).toBe(1);
      expect(postCount).toBe(1);
    });

    test('should return function result', async () => {
      const expectedResult = { data: 'test', number: 42 };
      
      const result = await withTransaction(client, async ({ session, db }) => {
        return expectedResult;
      });

      expect(result).toEqual(expectedResult);
    });

    test('should handle empty transaction', async () => {
      const result = await withTransaction(client, async ({ session, db }) => {
        // No operations
        return { empty: true };
      });

      expect(result).toEqual({ empty: true });
    });
  });

  describe('Error handling', () => {
    test('should rollback on error', async () => {
      try {
        await withTransaction(client, async ({ session, db }) => {
          const users = db.collection('users');
          const posts = db.collection('posts');
          
          await users.insertOne({ name: 'John' }, { session });
          await posts.insertOne({ title: 'Hello' }, { session });
          
          // Force error
          throw new Error('Transaction failed');
        });
      } catch (error) {
        expect(error.message).toBe('Transaction failed');
      }

      // Verify data was rolled back
      const userCount = await db.collection('users').countDocuments();
      const postCount = await db.collection('posts').countDocuments();
      expect(userCount).toBe(0);
      expect(postCount).toBe(0);
    });

    test('should handle async errors', async () => {
      try {
        await withTransaction(client, async ({ session, db }) => {
          const users = db.collection('users');
          await users.insertOne({ name: 'John' }, { session });
          
          // Async error
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Async error')), 10);
          });
        });
      } catch (error) {
        expect(error.message).toBe('Async error');
      }

      // Verify rollback
      const userCount = await db.collection('users').countDocuments();
      expect(userCount).toBe(0);
    });
  });

  describe('Session management', () => {
    test('should provide session to transaction function', async () => {
      let receivedSession = null;
      
      await withTransaction(client, async ({ session, db }) => {
        receivedSession = session;
        expect(session).toBeDefined();
        expect(session.constructor.name).toBe('ClientSession');
      });

      expect(receivedSession).toBeDefined();
    });

    test('should provide db instance', async () => {
      let receivedDb = null;
      
      await withTransaction(client, async ({ session, db }) => {
        receivedDb = db;
        expect(db).toBeDefined();
        expect(db.databaseName).toBe('test');
      });

      expect(receivedDb).toBeDefined();
    });
  });

  describe('Transaction options', () => {
    test('should pass transaction options', async () => {
      const options = {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        maxCommitTimeMS: 10000
      };

      // This test mainly verifies that options are passed without error
      // MongoDB Memory Server doesn't support all transaction options
      const result = await withTransaction(client, async ({ session, db }) => {
        return { optionsReceived: true };
      }, options);

      expect(result).toEqual({ optionsReceived: true });
    });

    test('should work with empty options', async () => {
      const result = await withTransaction(client, async ({ session, db }) => {
        return { emptyOptions: true };
      }, {});

      expect(result).toEqual({ emptyOptions: true });
    });
  });

  describe('Multiple operations', () => {
    test('should handle multiple collections', async () => {
      const result = await withTransaction(client, async ({ session, db }) => {
        const users = db.collection('users');
        const posts = db.collection('posts');
        const comments = db.collection('comments');
        
        await users.insertOne({ name: 'John' }, { session });
        await posts.insertOne({ title: 'Hello' }, { session });
        await comments.insertOne({ text: 'Nice post' }, { session });
        
        return { collections: 3 };
      });

      expect(result).toEqual({ collections: 3 });
      
      // Verify all data was committed
      const userCount = await db.collection('users').countDocuments();
      const postCount = await db.collection('posts').countDocuments();
      const commentCount = await db.collection('comments').countDocuments();
      expect(userCount).toBe(1);
      expect(postCount).toBe(1);
      expect(commentCount).toBe(1);
    });

    test('should handle complex operations', async () => {
      const result = await withTransaction(client, async ({ session, db }) => {
        const users = db.collection('users');
        
        // Insert multiple documents
        await users.insertMany([
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
          { name: 'Bob', age: 35 }
        ], { session });
        
        // Update documents
        await users.updateOne(
          { name: 'John' }, 
          { $set: { age: 31 } }, 
          { session }
        );
        
        // Count documents
        const count = await users.countDocuments({}, { session });
        
        return { count };
      });

      expect(result.count).toBe(3);
      
      // Verify updates were committed
      const john = await db.collection('users').findOne({ name: 'John' });
      expect(john.age).toBe(31);
    });
  });
});
