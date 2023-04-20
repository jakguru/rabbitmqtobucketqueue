import { ValidationType } from '../../../contracts/validation'

const redisOptions: ValidationType = (value: any) => {
  if ('object' !== typeof value || null === value) {
    return 'must be an object'
  }
  const validate = require('validate.js')
  validate.capitalize = (v) => v
  validate.prettify = (v) => v
  validate['options'] = { format: 'flat' }
  const constraints = {
    host: function (_value, attributes) {
      if (attributes.path) {
        return undefined
      }
      return {
        presence: {
          message: 'is required when path is not set',
        },
        type: 'string',
      }
    },
    port: function (_value, attributes) {
      if (attributes.path) {
        return undefined
      }
      return {
        presence: {
          message: 'is required when path is not set',
        },
        type: 'integer',
        numericality: {
          noStrings: true,
          strict: true,
          onlyInteger: true,
          greaterThan: 0,
          lessThanOrEqualTo: 65535,
        },
      }
    },
    db: function (_value, attributes) {
      if (attributes.path) {
        return undefined
      }
      return {
        presence: {
          message: 'is required when path is not set',
        },
        type: 'integer',
        numericality: {
          noStrings: true,
          strict: true,
          onlyInteger: true,
          greaterThanOrEqualTo: 0,
        },
      }
    },
    path: function (_value, attributes) {
      if (
        'undefined' !== typeof attributes.host &&
        'undefined' !== typeof attributes.port &&
        'undefined' !== typeof attributes.db
      ) {
        return undefined
      }
      return {
        presence: {
          message: 'is required when host, port and db are not set',
        },
        type: 'string',
      }
    },
  }
  try {
    const validatorErrors = validate(value, constraints)
    if (!Array.isArray(validatorErrors) || validatorErrors.length === 0) {
      return true
    }
    return validatorErrors.join(', ')
  } catch (errors) {
    return errors.join(', ')
  }
}
export default redisOptions
