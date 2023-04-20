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
    table: {
      presence: true,
      type: 'string',
    },
    client: {
      presence: true,
      type: 'string',
      inclusion: {
        within: ['pg', 'sqlite3', 'mysql', 'mysql2', 'mssql', 'oracledb'],
        message: 'is not a supported database client',
      },
    },
    connection: {
      presence: true,
      type: 'databaseConnectionOptions',
      databaseConnectionOptions: true,
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
