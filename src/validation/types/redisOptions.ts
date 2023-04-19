import { ValidationType } from '../../../contracts/validation'

const redisOptions: ValidationType = (value: any) => {
  const validate = require('validate.js')
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
      if (attributes.host && attributes.port && attributes.db) {
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
    return validatorErrors
  } catch (errors) {
    return errors
  }
}
export default redisOptions
