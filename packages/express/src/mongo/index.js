// @godbliss/express mongo utilities
const { makeCollections, registerCollection } = require('./collections');
const { createDocumentHelper } = require('./document');
const { withTransaction } = require('./transaction');

module.exports = {
  // collections
  makeCollections,
  registerCollection,
  // document
  createDocumentHelper,
  // transaction
  withTransaction,
};
