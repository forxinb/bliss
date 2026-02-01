// Integration tests for MongoDB utilities

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { makeCollections, registerCollection, createDocumentHelper } = require('../index');

describe('MongoDB Utilities Integration', () => {
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
    registerCollection(Collections, 'comments');
    
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
    const collections = ['users', 'posts', 'comments'];
    await Promise.all(
      collections.map(async (name) => {
        if (Collections[name]) {
          await Collections[name].deleteMany({});
        }
      })
    );
  });

  describe('Complete workflow', () => {
    test('should handle complete CRUD workflow', async () => {
      // Create user
      const userResult = await docHelper.insertDoc('users', {
        name: 'John Doe',
        email: 'john@example.com',
        active: true
      });
      expect(userResult.acknowledged).toBe(true);

      // Create posts
      const post1Result = await docHelper.insertDoc('posts', {
        title: 'First Post',
        content: 'This is the first post',
        authorId: userResult.insertedId,
        published: true
      });

      const post2Result = await docHelper.insertDoc('posts', {
        title: 'Second Post',
        content: 'This is the second post',
        authorId: userResult.insertedId,
        published: false
      });

      // Find posts with pagination
      const postsResult = await docHelper.findDocs('posts', 
        { authorId: userResult.insertedId }, 
        { sort: { _id: -1 } }, 
        { page: 1, pageSize: 10 }
      );
      expect(postsResult.data).toHaveLength(2);
      expect(postsResult.data[0].title).toBe('Second Post');

      // Update post
      await docHelper.updateDoc('posts', 
        { _id: post1Result.insertedId }, 
        { $set: { published: true } }
      );

      // Verify update
      const updatedPost = await docHelper.findDoc('posts', { _id: post1Result.insertedId });
      expect(updatedPost.published).toBe(true);

      // Delete post
      const deleteResult = await docHelper.deleteDoc('posts', { _id: post2Result.insertedId });
      expect(deleteResult.deletedCount).toBe(1);

      // Verify deletion
      const deletedPost = await docHelper.findDoc('posts', { _id: post2Result.insertedId });
      expect(deletedPost).toBeNull();
    });

    test('should handle basic workflow without transactions', async () => {
      // Create user
      const userResult = await docHelper.insertDoc('users', {
        name: 'Basic User',
        email: 'basic@example.com'
      });

      // Create post
      const postResult = await docHelper.insertDoc('posts', {
        title: 'Basic Post',
        content: 'This post was created normally',
        authorId: userResult.insertedId
      });

      // Verify both were created
      expect(userResult.insertedId).toBeDefined();
      expect(postResult.insertedId).toBeDefined();
    });
  });

  describe('Error handling', () => {
    test('should handle collection not found errors gracefully', async () => {
      await expect(docHelper.findDoc('nonExistent', {})).rejects.toThrow('Collection not found: nonExistent');
      await expect(docHelper.insertDoc('nonExistent', {})).rejects.toThrow('Collection not found: nonExistent');
    });

    test('should handle invalid operations gracefully', async () => {
      // Test inc without path
      await expect(docHelper.increase('users', null, {})).rejects.toThrow('inc: path is required');
    });
  });

  describe('Pagination edge cases', () => {
    beforeEach(async () => {
      // Insert test data
      const users = [];
      for (let i = 1; i <= 25; i++) {
        users.push({ name: `User ${i}`, order: i, active: i % 2 === 0 });
      }
      await Collections.users.insertMany(users);
    });

    test('should handle last page correctly', async () => {
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, { page: 3, pageSize: 10 });
      
      expect(result.data).toHaveLength(5); // Last page should have 5 items
      expect(result.pageInfo.page).toBe(3);
      expect(result.pageInfo.hasNext).toBe(false);
    });

    test('should handle cursor pagination with filters', async () => {
      const result = await docHelper.findDocs('users', 
        { active: true }, 
        { sort: { order: 1 } }, 
        { endCursor: 'first', pageSize: 5, cursorField: 'order' }
      );
      
      expect(result.data).toHaveLength(5);
      expect(result.data.every(user => user.active)).toBe(true);
    });
  });
});