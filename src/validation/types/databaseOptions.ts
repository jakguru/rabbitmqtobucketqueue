import { ValidationType } from '../../../contracts/validation'
import databaseConnectionOptions from './databaseConnectionOptions'
const databaseOptions: ValidationType = (value: any) => {
  const validate = require('validate.js')
  validate['options'] = { format: 'flat' }
  validate.validators.type.types['databaseConnectionOptions'] = databaseConnectionOptions
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
export default databaseOptions
