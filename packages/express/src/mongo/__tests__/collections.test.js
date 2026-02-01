// Collections tests

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { makeCollections, registerCollection } = require('../index');

describe('Collections', () => {
  let mongoServer;
  let client;
  let db;
  let Collections;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    Collections = makeCollections({ db });
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

  describe('makeCollections', () => {
    test('should create Collections object with db reference', () => {
      expect(Collections._db).toBe(db);
      expect(Collections._defaultOptions).toEqual({ ignoreUndefined: true });
    });

    test('should throw error when db is not provided', () => {
      expect(() => makeCollections()).toThrow('makeCollections: db is required');
    });
  });

  describe('registerCollection', () => {
    test('should register collection successfully', () => {
      const collection = registerCollection(Collections, 'testCollection');
      expect(collection).toBeDefined();
      expect(Collections.testCollection).toBe(collection);
    });

    test('should return existing collection if already registered', () => {
      const collection1 = registerCollection(Collections, 'testCollection');
      const collection2 = registerCollection(Collections, 'testCollection');
      expect(collection1).toBe(collection2);
    });

    test('should throw error when Collections is not provided', () => {
      expect(() => registerCollection()).toThrow('registerCollection: Collections is required');
    });

    test('should throw error when name is not provided', () => {
      expect(() => registerCollection(Collections)).toThrow('registerCollection: name is required');
    });
  });

  describe('Collections usage', () => {
    test('should access registered collections directly', async () => {
      // Register collections first
      const users = registerCollection(Collections, 'users');
      const posts = registerCollection(Collections, 'posts');
      
      expect(users).toBeDefined();
      expect(posts).toBeDefined();
      
      // Test basic operations
      const result = await users.insertOne({ name: 'Test User', email: 'test@example.com' });
      expect(result.insertedId).toBeDefined();
      
      const user = await users.findOne({ email: 'test@example.com' });
      expect(user.name).toBe('Test User');
    });

    test('should throw error for unregistered collection in dev mode', () => {
      // Create Collections with isDev = true to test Proxy behavior
      const devCollections = makeCollections({ db, isDev: true });
      expect(() => devCollections.nonExistentCollection).toThrow('Collection not registered: nonExistentCollection');
    });
  });
});
