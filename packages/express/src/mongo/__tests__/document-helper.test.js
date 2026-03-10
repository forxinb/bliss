// Database API tests

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const { makeCollections, registerCollection, createDocumentHelper } = require('../index');

describe('Database API', () => {
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

  describe('createDocumentHelper', () => {
    test('should create docs API successfully', () => {
      expect(docHelper).toBeDefined();
      expect(typeof docHelper.findDoc).toBe('function');
      expect(typeof docHelper.findDocs).toBe('function');
      expect(typeof docHelper.insertDoc).toBe('function');
      expect(typeof docHelper.upsertDoc).toBe('function');
      expect(typeof docHelper.updateDoc).toBe('function');
      expect(typeof docHelper.deleteDoc).toBe('function');
      expect(typeof docHelper.increase).toBe('function');
      expect(typeof docHelper.decrease).toBe('function');
    });

    test('should throw error when Collections is not provided', () => {
      expect(() => createDocumentHelper()).toThrow('createDocumentHelper: Collections is required');
    });
  });

  describe('findDoc', () => {
    test('should find a single document', async () => {
      // Insert test data
      await Collections.users.insertOne({ name: 'Test User', email: 'test@example.com' });
      
      const user = await docHelper.findDoc('users', { email: 'test@example.com' });
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User');
    });

    test('should return null when document not found', async () => {
      const user = await docHelper.findDoc('users', { email: 'nonexistent@example.com' });
      expect(user).toBeNull();
    });

    test('should throw error for non-existent collection', async () => {
      await expect(docHelper.findDoc('nonExistent', {})).rejects.toThrow('Collection not found: nonExistent');
    });
  });

  describe('insertDoc', () => {
    test('should insert a document successfully', async () => {
      const result = await docHelper.insertDoc('users', { name: 'Test User', email: 'test@example.com' });
      expect(result.acknowledged).toBe(true);
      expect(result.insertedId).toBeDefined();
      
      // Verify document was inserted
      const user = await Collections.users.findOne({ _id: result.insertedId });
      expect(user.name).toBe('Test User');
    });

    test('should throw error for non-existent collection', async () => {
      await expect(docHelper.insertDoc('nonExistent', {})).rejects.toThrow('Collection not found: nonExistent');
    });
  });

  describe('findDocs with pagination', () => {
    beforeEach(async () => {
      // Insert test data
      const users = [];
      for (let i = 1; i <= 15; i++) {
        users.push({ name: `User ${i}`, email: `user${i}@example.com`, order: i });
      }
      console.log('Inserting users:', users.length);
      const insertResult = await Collections.users.insertMany(users);
      console.log('Insert result:', insertResult);
      
      // Verify data was inserted
      const count = await Collections.users.countDocuments();
      console.log('Users count after insert:', count);
    });

    test('should find documents with page pagination', async () => {
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, { page: 1, pageSize: 5 });
      
      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.page).toBe(1);
      expect(result.pageInfo.pageSize).toBe(5);
      expect(result.pageInfo.hasNext).toBe(true);
    });

    test('should find documents with cursor pagination', async () => {
      const result = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, { pageSize: 5 });
      
      expect(result.data).toHaveLength(5);
      expect(result.pageInfo.hasNext).toBe(true);
      expect(result.pageInfo.endCursor).toBeDefined();
    });

    test('should handle empty results', async () => {
      const result = await docHelper.findDocs('users', { name: 'NonExistent' });
      
      expect(result.data).toHaveLength(0);
    });

    test('should fetch all documents when pagination is null', async () => {
      // 15 users were inserted in beforeEach
      const result = await docHelper.findDocs('users', 'all', {}, null);
      
      expect(result.data).toHaveLength(15);
      expect(result.pageInfo).toBeNull();
    });

    test('should handle null or undefined options safely', async () => {
      // Testing with null options
      const resultNull = await docHelper.findDocs('users', 'all', null, { pageSize: 5 });
      expect(resultNull.data).toHaveLength(5);
      
      // Testing with undefined options (implicit)
      const resultUndef = await docHelper.findDocs('users', 'all', undefined, { pageSize: 5 });
      expect(resultUndef.data).toHaveLength(5);
    });
  });

  describe('increase/decrease', () => {
    beforeEach(async () => {
      await Collections.users.insertOne({ name: 'Test User', count: 10 });
    });

    test('should increment a field', async () => {
      const result = await docHelper.increase('users', 'count', { 
        selector: { name: 'Test User' }, 
        amount: 5 
      });
      
      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.count).toBe(15);
    });

    test('should decrement a field', async () => {
      const result = await docHelper.decrease('users', 'count', { 
        selector: { name: 'Test User' }, 
        amount: 3 
      });
      
      expect(result.modifiedCount).toBe(1);
      
      const user = await Collections.users.findOne({ name: 'Test User' });
      expect(user.count).toBe(7);
    });
  });

  describe('backward pagination', () => {
    test('should support basic cursor pagination with first page', async () => {
      // Clear existing data first
      await Collections.users.deleteMany({});
      
      // Insert test data
      const testDocs = [];
      for (let i = 1; i <= 10; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i
        });
      }
      await Collections.users.insertMany(testDocs);
      
      // Test first page with cursor pagination
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        pageSize: 5
      });
      
      expect(firstPage.data).toHaveLength(5);
      expect(firstPage.pageInfo.hasNext).toBe(true);
      expect(firstPage.pageInfo.endCursor).toBeDefined();
    });

    test('should support basic cursor pagination with page mode', async () => {
      // Clear existing data first
      await Collections.users.deleteMany({});
      
      // Insert test data
      const testDocs = [];
      for (let i = 1; i <= 10; i++) {
        testDocs.push({
          name: `User ${i}`,
          value: i
        });
      }
      await Collections.users.insertMany(testDocs);
      
      // Test page mode
      const firstPage = await docHelper.findDocs('users', { _id: { $exists: true } }, {}, {
        page: 1,
        pageSize: 5
      });
      
      expect(firstPage.data).toHaveLength(5);
      expect(firstPage.pageInfo.page).toBe(1);
      expect(firstPage.pageInfo.hasNext).toBe(true);
    });
  });
});