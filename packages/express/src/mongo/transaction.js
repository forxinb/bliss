/**
 * Execute operations within a MongoDB transaction
 * @param {import('mongodb').MongoClient} client - MongoDB client
 * @param {Function} fn - Function to execute within transaction
 * @param {Object} options - Transaction options
 * @returns {Promise<*>} Transaction result
 * 
 * @example
 * // Basic usage
 * const result = await withTransaction(client, async ({ session, db }) => {
 *   const users = db.collection('users');
 *   const posts = db.collection('posts');
 *   
 *   await users.insertOne({ name: 'John' }, { session });
 *   await posts.insertOne({ title: 'Hello' }, { session });
 *   
 *   return { success: true };
 * });
 * 
 * // With transaction options
 * const result = await withTransaction(client, async ({ session, db }) => {
 *   // transaction logic
 * }, { 
 *   readConcern: { level: 'majority' },
 *   writeConcern: { w: 'majority' },
 *   maxCommitTimeMS: 10000
 * });
 */
async function withTransaction(client, fn, options = {}) {
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn({ session, db: client.db() });
    }, options);
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  withTransaction,
};
