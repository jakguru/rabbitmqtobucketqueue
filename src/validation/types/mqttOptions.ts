import { ValidationType } from '../../../contracts/validation'

const mqttOptions: ValidationType = (value: any) => {
  if ('object' !== typeof value || null === value) {
    return 'must be an object'
  }
  const validate = require('validate.js')
  validate.capitalize = (v) => v
  validate.prettify = (v) => v
  validate['options'] = { format: 'flat' }
  const constraints = {
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
        within: ['mqtt', 'mqtts', 'tcp', 'tls', 'ws', 'wss'],
        message: 'is not a valid mqtt protocol',
      },
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
export default mqttOptions
