import { ValidationType } from '../../../contracts/validation'

const rmqQueueOptions: ValidationType = (value: any) => {
  if ('object' !== typeof value || null === value) {
    return 'must be an object'
  }
  const validate = require('validate.js')
  validate.capitalize = (v) => v
  validate.prettify = (v) => v
  validate['options'] = { format: 'flat' }
  const constraints = {
    exclusive: {
      presence: false,
      type: 'boolean',
    },
    durable: {
      presence: false,
      type: 'boolean',
    },
    autoDelete: {
      presence: false,
      type: 'boolean',
    },
    arguments: {
      presence: false,
    },
    messageTtl: {
      presence: false,
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThanOrEqualTo: 0,
      },
    },
    expires: {
      presence: false,
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThan: 0,
      },
    },
    deadLetterExchange: {
      presence: false,
      type: 'string',
    },
    deadLetterRoutingKey: {
      presence: false,
      type: 'string',
    },
    maxLength: {
      presence: false,
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThan: 0,
      },
    },
    maxPriority: {
      presence: false,
      type: 'integer',
      numericality: {
        noStrings: true,
        strict: true,
        onlyInteger: true,
        greaterThan: 0,
        lessThanOrEqualTo: 255,
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
export default rmqQueueOptions
