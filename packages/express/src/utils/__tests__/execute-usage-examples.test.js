// execute usage examples tests

const { execute } = require('../execute.js');

describe('execute usage examples', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = { body: { name: 'Test User' } };
    mockRes = { json: jest.fn(), status: jest.fn() };
    mockNext = jest.fn();
  });

  test('async function usage example', async () => {
    // Business logic (async)
    const createUser = execute(async (req, res, next) => {
      // Simulation: Create user in database
      await new Promise(resolve => setTimeout(resolve, 10));
      const user = { id: 1, name: req.body.name };
      res.json(user);
    });

    await createUser(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ id: 1, name: 'Test User' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('sync function usage example', () => {
    // Business logic (sync)
    const getStatus = execute((req, res, next) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    getStatus(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok' })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('Promise-returning sync function example', async () => {
    // Business logic (returns Promise)
    const fetchData = execute((req, res, next) => {
      return fetch('/api/data')
        .then(response => response.json())
        .then(data => {
          res.json(data);
        });
    });

    // Mock fetch for this test
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: 'test' })
      })
    );

    await fetchData(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ data: 'test' });
    expect(mockNext).not.toHaveBeenCalled();

    global.fetch = undefined; // cleanup
  });

  test('error handling example', async () => {
    const error = new Error('Database connection failed');
    
    const failingHandler = execute(async (req, res, next) => {
      throw error;
    });

    await failingHandler(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
