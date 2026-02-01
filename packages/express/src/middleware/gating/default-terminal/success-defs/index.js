const doc = require('./doc');

module.exports = {
  // Default HTTP success response
  response: require('./response'),

  // Domain-specific success response
  create: doc.create,
  update: doc.update,
  delete: doc.delete,
  remove: doc.remove
};
