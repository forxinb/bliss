// Tests for _makeSelectorWithPaginationRangeConditionOnField behavior

const pagination = require('../document/pagination');
const { ObjectId } = require('mongodb');
const makeSelectorWithAdditionalFieldCondition = pagination._internals._makeSelectorWithPaginationRangeConditionOnField;

describe('_makeSelectorWithPaginationRangeConditionOnField', () => {
  test('query1: merge $lt into existing $in on _id', () => {
    const selector = { _id: { $in: [1, 2, 3, 4, 5] } };
    const result = makeSelectorWithAdditionalFieldCondition(selector, '_id', { $lt: 'someId' });
    expect(result).toEqual({ _id: { $in: [1, 2, 3, 4, 5], $lt: 'someId' } });
    // original selector should not be mutated
    expect(selector).toEqual({ _id: { $in: [1, 2, 3, 4, 5] } });
  });

  test('query2: merge $lt into existing $gt on age', () => {
    const selector = { age: { $gt: 20 } };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'age', { $lt: 50 });
    expect(result).toEqual({ age: { $gt: 20, $lt: 50 } });
  });

  test('query3: recursively merge under $or, converting arrays to $in', () => {
    const selector = { $or: [{ _id: [1, 2, 3] }, { _id: [4, 5, 6] }] };
    const result = makeSelectorWithAdditionalFieldCondition(selector, '_id', { $lt: 'someId' });
    expect(result).toEqual({
      $or: [
        { _id: { $in: [1, 2, 3], $lt: 'someId' } },
        { _id: { $in: [4, 5, 6], $lt: 'someId' } },
      ],
    });
  });

  test('does not merge on logical-only root; merges on child branches', () => {
    const selector = { $and: [{ a: [1, 2] }, { $or: [{ a: [3] }, { a: [4] }] }] };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'a', { $gt: 0 });
    expect(result).toEqual({
      $and: [
        { a: { $in: [1, 2], $gt: 0 } },
        { $or: [{ a: { $in: [3], $gt: 0 } }, { a: { $in: [4], $gt: 0 } }] },
      ],
    });
  });

  test('merges on same-level object with non-logical keys only once', () => {
    const selector = { x: { $gte: 1 }, y: { $lte: 9 } };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'x', { $lt: 5 });
    expect(result).toEqual({ x: { $gte: 1, $lt: 5 }, y: { $lte: 9 } });
  });

  test('creates new condition when field is missing', () => {
    const selector = { other: 1 };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'foo', { $exists: true });
    expect(result).toEqual({ other: 1, foo: { $exists: true } });
  });

  test('replaces scalar with condition object for target field', () => {
    const selector = { score: 10 };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'score', { $gt: 7 });
    expect(result).toEqual({ score: { $gt: 7 } });
  });

  test('selector with scalar ObjectId at _id replaces with condition object', () => {
    const fixedId = new ObjectId('64b000000000000000000001');
    const ltId = new ObjectId('64b0000000000000000000ff');
    const selector = { _id: fixedId };
    const result = makeSelectorWithAdditionalFieldCondition(selector, '_id', { $lt: ltId });

    // Check that the result has the expected structure
    expect(result).toHaveProperty('_id');
    expect(result._id).toHaveProperty('$lt');
    expect(result._id.$lt).toBeInstanceOf(ObjectId);
    expect(result._id.$lt.toHexString()).toBe(ltId.toHexString());
    // original selector remains unchanged
    expect(selector).toEqual({ _id: fixedId });
  });

  test('deep nesting with mixed logical/non-logical keys', () => {
    const selector = {
      $or: [
        { user: { id: [1, 2] }, role: 'admin' },
        { $and: [ { user: { id: [3] } }, { status: 'active' } ] },
      ],
    };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'user.id', { $ne: null });
    // Current behavior: adds 'user.id' condition at nodes containing non-logical keys
    expect(result).toEqual({
      $or: [
        {
          user: { id: [1, 2] },
          role: 'admin',
          'user.id': { $ne: null },
        },
        {
          $and: [
            { user: { id: [3] }, 'user.id': { $ne: null } },
            { status: 'active', 'user.id': { $ne: null } },
          ],
        },
      ],
    });
  });

  test('immutability: original selector not mutated for deep object', () => {
    const selector = { $or: [{ a: [1] }, { a: [2] }] };
    const result = makeSelectorWithAdditionalFieldCondition(selector, 'a', { $gt: 0 });
    expect(selector).toEqual({ $or: [{ a: [1] }, { a: [2] }] });
    expect(result).toEqual({ $or: [{ a: { $in: [1], $gt: 0 } }, { a: { $in: [2], $gt: 0 } }] });
  });
});
