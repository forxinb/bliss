const doc = require('./doc');

module.exports = {
  // Basic HTTP Success Response
  response: require('./response'),

  // Domain specific success response
  create: doc.create,
  update: doc.update,
  delete: doc.delete,
  remove: doc.remove
};
