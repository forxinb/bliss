const requestErrorDef = {
  bad: {
    code: 400
  },
  validationError: ({ error }) => ({
    code: 400,
    error: error
  }),
  notFound: {
    code: 404
  },
  conflict: {
    code: 409
  }
};

module.exports = requestErrorDef;
