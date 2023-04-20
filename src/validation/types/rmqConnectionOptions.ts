import { ValidationType } from '../../../contracts/validation'

const rmqConnectionOptions: ValidationType = (value: any) => {
  if ('object' !== typeof value || null === value) {
    return 'must be an object'
  }
  const validate = require('validate.js')
  validate.capitalize = (v) => v
  validate.prettify = (v) => v
  validate['options'] = { format: 'flat' }
  const constraints = {
    protocol: {
      type: 'string',
      presence: true,
    },
    hostname: {
      type: 'string',
      presence: true,
    },
    port: {
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThan: 0,
        lessThanOrEqualTo: 65535,
      },
      presence: true,
    },
    username: {
      type: 'string',
      presence: false,
    },
    password: {
      type: 'string',
      presence: false,
    },
    locale: {
      type: 'string',
      presence: false,
    },
    frameMax: {
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThanOrEqualTo: 0,
      },
      presence: false,
    },
    heartbeat: {
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThanOrEqualTo: 0,
      },
      presence: false,
    },
    vhost: {
      type: 'string',
      presence: false,
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
export default rmqConnectionOptions
