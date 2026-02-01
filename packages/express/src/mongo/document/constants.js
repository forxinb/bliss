// MongoDB utilities constants

const ERRORS = {
  COLLECTION_NOT_FOUND: (name) => `Collection not found: ${name}`,
  COLLECTIONS_REQUIRED: 'createDocumentHelper: Collections is required',
  PATH_REQUIRED: 'inc: path is required',
};

const PAGINATION = {
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 10,
  DEFAULT_SORT: { _id: -1 },
  DEFAULT_CURSOR_FIELD: '_id',
};

const QUERY = {
  NO_MATCH_SELECTOR: { _id: 'not to find any' },
};

module.exports = {
  ERRORS,
  PAGINATION,
  QUERY,
};
