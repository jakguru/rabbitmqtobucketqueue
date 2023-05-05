import { ValidationType } from '../../../contracts/validation'
import databaseConnectionOptions from './databaseConnectionOptions'
const databaseOptions: ValidationType = (value: any) => {
  if ('object' !== typeof value || null === value) {
    return 'must be an object'
  }
  const validate = require('validate.js')
  validate.capitalize = (v) => v
  validate.prettify = (v) => v
  validate['options'] = { format: 'flat' }
  validate.validators.type.types['databaseConnectionOptions'] = (value) => {
    return 'string' !== typeof databaseConnectionOptions(value)
  }
  validate.validators.databaseConnectionOptions = (value) => {
    const res = databaseConnectionOptions(value)
    return 'string' === typeof res ? res : undefined
  }
  const constraints = {
    encryptionKey: {
      presence: true,
      type: 'string',
    },
    path: {
      presence: true,
      type: 'string',
    },
    host: {
      presence: true,
      type: 'string',
    },
    port: {
      presence: true,
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThan: 0,
        lessThanOrEqualTo: 65535,
      },
    },
    protocol: {
      presence: true,
      type: 'string',
      inclusion: {
        within: ['http', 'https', 'ws', 'wss'],
        message: 'is not a supported database client',
      },
    },
    allowInsecure: {
      type: 'boolean',
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
export default databaseOptions
