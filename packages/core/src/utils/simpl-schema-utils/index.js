/**
 * Simpl-Schema Utilities
 * 
 * Collection of utilities for schema validation, transformation, and merging based on simpl-schema
 * 
 * @description Supports practical features like advanced schema validation, form generation, and DML processing
 *              Provides readOnly/initialValue system, dynamic schema manipulation, and type safety
 * 
 * @future Planned to be separated as @godbliss/simpl-schema-utils after stabilization
 */

// Dependency management (peerDependency)
let SimpleSchema, _, ObjectId;

try {
  const SimpleSchemaModule = require('simpl-schema');
  SimpleSchema = SimpleSchemaModule.default;
  if (!SimpleSchema) {
    console.warn('simpl-schema module structure has changed. Please check compatibility.');
    SimpleSchema = null;
  }
} catch (error) {
  console.warn('simpl-schema is not installed. Please run: npm install simpl-schema');
  SimpleSchema = null;
}

try {
  _ = require('lodash');
} catch (error) {
  console.warn('lodash is not installed. Please run: npm install lodash');
  _ = null;
}

try {
  ({ ObjectId } = require('bson'));
} catch (error) {
  console.warn('bson is not installed. Please run: npm install bson');
  ObjectId = null;
}

// Set SimpleSchema extension options (Required)
if (SimpleSchema && typeof SimpleSchema.extendOptions === 'function') {
  SimpleSchema.extendOptions(['readOnly', 'placeholder', 'help', 'remark', 'input', 'initialValue']);
} else {
  console.error('SimpleSchema.extendOptions is not available. Custom schema options will not work.');
  console.error('This utility requires simpl-schema with extendOptions support.');
  SimpleSchema = null; // Set to null as it is unusable
}



/**
 * Create a form object from the schema
 * @param {SimpleSchema} schema - Schema object
 * @param {boolean} isDmlForm - Whether it is a DML form (excludes readOnly fields)
 * @returns {Object} Form object
 */
function makeFormObject(schema, isDmlForm = false) {
  const obj = {};

  _.each(schema.objectKeys(), (key) => {
    const def = schema.getDefinition(key);

    // Check for conflict between readOnly and defaultValue
    if (_.has(def, 'defaultValue') && schema.getIsReadOnly(key)) {
      console.log('defaultValue is not allowed with readOnly; use initialValue instead', def);
      throw new Error('defaultValue is not allowed with readOnly; use initialValue instead');
    }

    let value;

    // Handle nested schema
    if (SimpleSchema.isSimpleSchema(def.type[0].type)) {
      value = makeFormObject(def.type[0].type, isDmlForm);
    } else {
      // Use initialValue (instead of defaultValue)
      value = schema.get(key, 'initialValue');
    }

    if (isDmlForm) {
      const readOnly = schema.getIsReadOnly(key);
      if (!readOnly) {
        // For Arrays, empty array [] is allowed (empty array is a valid initial value)
        // For Objects only, check for empty object {} and warn
        if (_.isPlainObject(value) && _.isEmpty(value)) {
          console.warn(`Skipping assignment of empty object to field '${key}' in DML form`);
        } else {
          obj[key] = _.cloneDeep(value); // Deep copy reference types
        }
      }
    } else {
      obj[key] = _.cloneDeep(value); // Deep copy reference types
    }

    return true; // prevent break
  });

  return obj;
}

/**
 * Advanced schema creation function (based on original makeSchema)
 * 
 * 🎯 Reason for using makeSchema:
 * - createSchema implies "creating a new schema definition"
 * - This function "receives existing schemas to extend/combine", so 'make' is more appropriate
 * - Prevent conflict with createSchema, updateSchema in actual usage examples
 * - Matches the meaning of 'make' as it includes conditional logic and method extensions
 * 
 * @param {Array|Object} sourceOrSources - Schema sources
 * @param {Object} customSchemaOptions - Custom schema options
 * @returns {SimpleSchema} Extended schema object
 */
function makeSchema(sourceOrSources = [], customSchemaOptions = {}) {
  if (!SimpleSchema || !_) {
    throw new Error('simpl-schema and lodash are required.');
  }

  const defaultSchemaOptions = {
    requiredByDefault: false
  };

  const schemaOptions = _.merge(defaultSchemaOptions, customSchemaOptions);
  const sources = _.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources];

  const sourceSchemas = _.map(sources, (source) => new SimpleSchema(source, schemaOptions));
  const schemaData = _.merge({}, ...sourceSchemas);
  const schema = new SimpleSchema(schemaData, schemaOptions);

  /**
   * Create form object (does not support clean)
   */
  schema.getForm = function (doc) {
    const form = makeFormObject(this);
    if (doc) {
      const _doc = _.pick(doc, _.keys(form));
      _.merge(form, _doc);
    }
    return form;
  };

  /**
   * Create DML form (readOnly removed + optional clean)
   */
  schema.getDmlForm = function (form, suppressClean = false) {
    const dmlForm = makeFormObject(this, true);
    if (form) {
      const _form = _.pick(form, _.keys(dmlForm));
      _.merge(dmlForm, _form);
    }

    if (!suppressClean) {
      return schema.clean(dmlForm, {
        autoConvert: false,
        removeEmptyStrings: false,
        trimStrings: true,
        getAutoValues: true
      });
    } else {
      return dmlForm;
    }
  };

  /**
   * Get field type
   */
  schema.getType = function (objectKey, typeIndex = 0) {
    const def = this.getDefinition(objectKey);
    return def.type[typeIndex].type;
  };

  /**
   * Check if field is required
   */
  schema.getIsRequired = function (objectKey) {
    const def = this.getDefinition(objectKey);
    return def.optional !== true;
  };

  /**
   * Check if field is readOnly
   */
  schema.getIsReadOnly = function (objectKey) {
    const def = this.getDefinition(objectKey);
    return def.readOnly === true;
  };

  /**
   * Get RegExp
   */
  schema.getRegEx = function (objectKey, typeIndex = 0) {
    const def = this.getDefinition(objectKey);
    return def.type[typeIndex].regEx;
  };

  /**
   * Get input type
   */
  schema.getInput = function (objectKey) {
    const def = this.getDefinition(objectKey);
    return def.input;
  };

  /**
   * Get nested schema
   */
  schema.getNestedSchema = function (objectKey) {
    const def = this.getDefinition(objectKey);
    if (SimpleSchema.isSimpleSchema(this.getType(objectKey))) {
      return this.getType(objectKey);
    }
    return undefined;
  };

  /**
   * Alter schema (convert required to optional)
   */
  schema.alter = function (defOrSchema = {}) {
    if (!_.get(this, '_constructorOptions.requiredByDefault')) {
      _.each(defOrSchema, (obj, key) => {
        if (!SimpleSchema.isSimpleSchema(obj)) {
          if (_.has(obj, 'required')) {
            defOrSchema[key].optional = !obj.required;
            delete defOrSchema[key].required;
          }
        }
        return true;
      });
    }
    return this.extend(defOrSchema);
  };

  /**
   * Modify schema to handle only allowed fields
   * 
   * # alterWithAllows vs pickAndAlter
   * 
   * alterWithAllows:
   *   - Manipulate existing schema to extend/modify
   *   - Form object may include disallowed fields (value is undefined)
   *   - Example: 'deletedBy' field exists in schema but only undefined is allowed in form (acting as placeholder) during document creation
   * 
   * pickAndAlter:
   *   - Create new schema with selected fields
   *   - Form object contains only selected fields
   *   - Used when creating a narrow-scoped form
   */
  schema.alterWithAllows = function (allows = {}) {
    return this.alter((() => {
      const schemaKeys = this._schemaKeys;
      const allowedKeys = _.keys(allows);
      const disallowedKeys = _.filter(schemaKeys, (key) => !allowedKeys.includes(key));
      const disallows = {};

      _.each(disallowedKeys, (key) => {
        disallows[key] = {
          custom: function () {
            const { value } = this;
            if (value !== undefined) {
              return `${this.key} is not allowed`;
            }
            return undefined;
          }
        };
        return true;
      });

      return { ...allows, ...disallows };
    })());
  };

  /**
   * Create new schema after selecting fields
   */
  schema.pickAndAlter = function (defs = {}) {
    return makeSchema(this.pick(..._.keys(defs))).alter(defs);
  };

  return schema;
}





// TODO: Need to add RegEx utilities (removed in simpl-schema v3)
// - Email validation RegEx (replaces SimpleSchema.RegEx.Email)
// - URL validation RegEx (replaces SimpleSchema.RegEx.Url)
// - Domain validation RegEx
// - IP address validation RegEx
// - Phone number validation RegEx (by country)
// 
// Example implementation:
// const RegExPatterns = {
//   Email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
//   Url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
//   Domain: /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/,
//   IPv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
// };

/**
 * Schema field creation helpers
 */
const SchemaFields = {
  /**
   * readOnly string field
   */
  readOnlyString: (params = {}) => {
    if (_.has(params, 'defaultValue')) {
      console.log('Error: defaultValue is not allowed with readOnly; use initialValue instead', params);
      throw new Error('defaultValue is not allowed with readOnly; use initialValue instead');
    }
    return {
      type: String,
      readOnly: true,
      ...params
    };
  },

  /**
   * ObjectId field
   */
  oid: (params = {}) => {
    const { custom: additionalCustom = () => undefined, ...other } = params;

    return {
      type: ObjectId,
      blackbox: true,
      custom: function () {
        const { value } = this;
        const bindedAdditionalCustom = additionalCustom.bind(this);

        if (this.definition.optional && value === undefined) {
          return bindedAdditionalCustom();
        }

        if (!ObjectId.isValid(value)) {
          return 'Invalid ObjectId';
        }
        return bindedAdditionalCustom();
      },
      ...other
    };
  },

  /**
   * YYYYMMDD date field
   */
  yyyymmdd: (params = {}) => ({
    type: String,
    min: 8,
    max: 8,
    input: 'yyyymmdd',
    ...params
  }),

  /**
   * Field that must be null
   */
  mustBeNull: (params = {}) => ({
    initialValue: null,
    ...params,
    required: false,
    custom: function () {
      return this.value !== null ? 'must be null' : undefined;
    }
  })
};

// Export in CommonJS style (Comply with Module System Strategy)
module.exports = {
  // 3 main exports
  makeSchema,
  SimpleSchema: SimpleSchema || null,
  SchemaFields,
};
