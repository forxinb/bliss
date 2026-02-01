function makeCollections({ db, defaultOptions = { ignoreUndefined: true }, isDev = false } = {}) {
  if (!db) throw new Error('makeCollections: db is required');
  const _Collections = {};

  _Collections._db = db;
  _Collections._defaultOptions = defaultOptions;

  if (isDev) {
    return new Proxy(_Collections, {
      get(target, prop) {
        if (_Collections[prop]) return _Collections[prop];
        throw new Error(`Collection not registered: ${prop}`);
      }
    });
  }

  return _Collections;
}

function registerCollection(Collections, name, options = {}) {
  if (!Collections) throw new Error('registerCollection: Collections is required');
  if (!name) throw new Error('registerCollection: name is required');
  
  if (Collections[name]) return Collections[name];
  
  const db = Collections._db;
  const col = db.collection(name, { ...Collections._defaultOptions, ...options });
  Collections[name] = col;
  return col;
}

module.exports = { makeCollections, registerCollection };


