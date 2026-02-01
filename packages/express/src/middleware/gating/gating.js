const _ = require('lodash');

const {
  SimpleSchema,
  BSON,
  ObjectId,
  errorDefsFromRaw,
  successDefsFromRaw,
  gateDefsFromRaw,
  defaultTerminalDef
} = require('@godbliss/core/utils');

// terminalDef object in file scope
let terminalDef = null;

const initializeTerminalDef = (projectTerminalDef = {}) => {
  // Validate if the custom validationError provided by the project is a function
  // (Does not validate possibility of runtime errors in function)
  if (_.has(projectTerminalDef, 'errorDefs.request.validationError') && !_.isFunction(projectTerminalDef.errorDefs.request.validationError)) {
    throw new Error('validationError must be a function');
  }

  // TODO: Implement additional validation if needed
  // - Overwriting static error with null/undefined (request.bad = null)
  // - Overwriting static error with function (request.bad = () => {...})
  // - Overwriting function with static object (validationError = {...})
  // - Other type mismatches

  // Merge defaultTerminalDef and projectTerminalDef
  terminalDef = {
    errorDefs: { ...defaultTerminalDef.errorDefs, ...(projectTerminalDef.errorDefs || {}) },
    successDefs: { ...defaultTerminalDef.successDefs, ...(projectTerminalDef.successDefs || {}) },
    gateDefs: { ...defaultTerminalDef.gateDefs, ...(projectTerminalDef.gateDefs || {}) }
  };
  console.log('Gating initialized with merged terminalDef');
};

const gating = (req, res, next) => {
  if (!terminalDef) {
    next(new Error('TerminalDef not initialized'));
    return;
  }

  const gateDef = _.get(terminalDef.gateDefs, `${req.baseUrl}${req.route.path}.${req.method}`);

  if (gateDef) {
    // request gate
    req.gate = { gateDef: gateDef };

    // TODO: For form, consider whether to pass to gate.form regardless of schema presence. withGate passes form regardless of schema.
    let form;
    if (!gateDef.formPath) {
      form = req.body;
    } else {
      form = _.get(req, `body.${gateDef.formPath}`, {});
    }

    if (gateDef.schema) {
      // // TODO: For form, consider whether to pass to gate.form regardless of schema presence. withGate passes form regardless of schema.
      // let form;
      // if (!gate.formPath) {
      //   form = req.body;
      // } else {
      //   form = _.get(req, `body.${gate.formPath}`, {});
      // }

      let schema;
      if (_.isFunction(gateDef.schema)) {
        // TODO: support schemaSelector that will be passed from ui
        schema = gateDef.schema(form);
      } else {
        schema = gateDef.schema;
      }

      // Use library check instead of instanceof to avoid module-boundary issues
      // For detailed rationale, see react `use-gate.js` note above the same check
      if (!SimpleSchema.isSimpleSchema(schema)) {
        next(terminalDef.errorDefs.system.gateError);
        return;
      }

      // set & check params with form
      const params = _.merge({}, (req.params || {}), (req.query || {}));

      if (!(_.isEmpty(params) && _.isEmpty(gateDef.paramsToForm))) {
        let paramCheckError = null;
        _.each(gateDef.paramsToForm, (formKey, paramKey) => {
          const paramValue = req.params[paramKey];
          let castedParamValue;

          switch (schema.getType(formKey)) {
            // TODO: cast more types - Verify need in future tests before extending (Number, Boolean, Date, etc.)
            case ObjectId:
              castedParamValue = new ObjectId(paramValue);
              break;
            default:
              castedParamValue = paramValue;
          }

          // set param value to form if not exist; will be validated by schema
          if (!_.has(form, formKey)) {
            form[formKey] = castedParamValue;
          }
          const formValue = form[formKey];

          if (!_.isEqual(formValue, castedParamValue)) {
            console.log(form, params, castedParamValue);
            paramCheckError = terminalDef.errorDefs.request.bad;
            return false;   // break
          } else {
            return true;    // continue
          }
        });

        if (paramCheckError) {
          next(paramCheckError);
          return;
        }
      }

      // validate form
      try {
        schema.validate(form);
        req.gate.schema = schema;
        // dmlForm = schema.getDmlForm form
        // req.gate.form = dmlForm

        // Note: Not a dml form !!!!
        form = schema.getForm(form);
        req.gate.form = form;
      } catch (error) {
        next(terminalDef.errorDefs.request.validationError({ error }));
        return;
      }
    }

    if (gateDef.lazySchemas) {
      let lazySchemas;
      if (_.isFunction(gateDef.lazySchemas)) {
        // TODO: support schemaSelector that will be passed from ui
        lazySchemas = gateDef.lazySchemas(form);
      } else {
        lazySchemas = gateDef.lazySchemas;
      }

      let lazySchemasError;
      _.each(lazySchemas, (schema) => {
        // Use library check instead of instanceof to avoid module-boundary issues
        // For detailed rationale, see react `use-gate.js` note above the same check
        if (!SimpleSchema.isSimpleSchema(schema)) {
          lazySchemasError = terminalDef.errorDefs.system.gateError;
          return false;    // break
        }
        return true;    // prevent break
      });

      if (lazySchemasError) {
        next(lazySchemasError);
        return;
      }

      req.gate.lazySchemas = lazySchemas;
    }

    // TODO: req.gate.functions? ex) userMustBeOwnerOfDoc
    // TODO: validate req.param.someId with form._id

    // response gate
    res.gate = {
      gateDef: gateDef,
      getError: function (path = '') {
        // error = _.get gate, "errorDef.#{path}"   # not works! cause path contains dot(.)
        let error;
        // custom error spec defined in gate
        const gateCustomErrorSpec = _.get(this.gateDef, 'errorSpec', {})[path];
        const errorDef = _.get(terminalDef, `errorDefs.${path}`);
        // errors not defined in gate return undefined
        if (_.isObject(gateCustomErrorSpec) && _.isObject(errorDef)) {
          error = { ...errorDef, ...gateCustomErrorSpec };
        }
        return error;
      },
      error: function (path = '') {
        // TODO: Verify correct operation with test code
        const error = this.getError(path);
        // errors not defined in gate raise gateError
        if (!error) {
          // throw Error.system.gateError
          // Wanted to throw error but high possibility of eval failure + server stop as below
          // [UnhandledPromiseRejection: This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled by .catch(). The promise rejected with the reason "#<Object>".] {
          //   code: 'ERR_UNHANDLED_REJECTION'
          // }
          // Referring to /nextcallbacktest, decided to use next error
          // TODO: Identify possible related issues
          next(terminalDef.errorDefs.system.gateError);
          return;
        }
        next(error);
      },
      success: function (path = '', data = {}, options = {}) {
        // 1. successDef (default)
        const successDef = _.get(terminalDef, `successDefs.${path}`);
        if (!successDef) {
          next(terminalDef.errorDefs.system.gateError);
          return;
        }

        // 2. successSpec (override per gate) - dot(.) problem resolution
        // successSpec = _.get gate, "successSpec.#{path}"    # not works! cause path contains dot(.)
        const successSpec = _.get(this.gateDef, 'successSpec', {})[path] || {};

        // 3. Final merge: successDef -> successSpec -> customSuccess
        const _success = {
          ...successDef,
          ...successSpec,
          ..._.get(options, 'customSuccess', {})
        };

        const statusCode = _.get(_success, 'code', 400);
        // TODO: error if status code isnt correct
        res.status(statusCode);

        const contentType = _.get(_success, 'contentType', 'json');

        switch (contentType) {
          case 'bson':
            res.set('Content-Type', 'application/bson');
            // bsn = BSON.serialize(body)
            const bsn = BSON.serialize({ ..._success, data });
            res.send(bsn);
            return;
          case 'json':
            res.json({ ..._success, data });
            return;
          default:
            next(terminalDef.errorDefs.system.gateError);
            return;
        }
      }
    };

    next();
  } else {
    console.log('Gate Not Found :: ', req.baseUrl, req.path, req.method, req.route.path);
    next(terminalDef.errorDefs.system.gateNotFound);
  }
};

// Import build functions from @godbliss/core

module.exports = {
  initializeTerminalDef,
  gating
};
