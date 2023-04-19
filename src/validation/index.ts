import validate from 'validate.js'
import QueueType from './types/queue'
import RmqConnectionOptionsType from './types/rmqConnectionOptions'
import RmqQueueOptionsType from './types/rmqQueueOptions'
import RmqCoordinatorType from './types/coordinator'
import redisOptions from './types/redisOptions'
import mqttOptions from './types/mqttOptions'
import databaseOptions from './types/databaseOptions'
import databaseConnectionOptions from './types/databaseConnectionOptions'
import loggerOptions from './types/loggerOptions'
import callable from './types/callable'
import undefinedType from './types/undefined'

import type {
  ValidationType,
  ValidationMessage,
  DetailedValidationError,
} from '../../contracts/validation'

validate['Promise'] = Promise
validate.formatters['rmqbq'] = (errors: DetailedValidationError[]) => {
  return errors.map((error) => {
    if (error.validator === 'type') {
      let sub
      switch (error.options) {
        case 'queue':
          sub = QueueType(error.value)
          break
        case 'rmqConnectionOptions':
          sub = RmqConnectionOptionsType(error.value)
          break
        case 'rmqQueueOptionsType':
          sub = RmqQueueOptionsType(error.value)
          break
        case 'rmqCoordinatorType':
          sub = RmqCoordinatorType(error.value)
          break
        case 'redisOptions':
          sub = redisOptions(error.value)
          break
        case 'mqttOptions':
          sub = mqttOptions(error.value)
          break
        case 'databaseOptions':
          sub = databaseOptions(error.value)
          break
        case 'databaseConnectionOptions':
          sub = databaseConnectionOptions(error.value)
          break
        case 'loggerOptions':
          sub = loggerOptions(error.value)
          break
        case 'callable':
          sub = callable(error.value)
          break
        case 'undefined':
          sub = undefinedType(error.value)
          break
        default:
          return `configuration attribute "${error.attribute}" must be of type ${error.options}`
      }
      if ('string' === typeof sub) {
        return `configuration attribute "${error.attribute}" ${sub}`
      } else if (Array.isArray(sub)) {
        return `configuration attribute "${error.attribute}" has the following errors: ${sub.join(
          ', '
        )}`
      } else {
        // console.log({ sub, kind: error.options, value: error.value })
        return `configuration attribute "${error.attribute}" is not a valid value`
      }
    }
    if (error.validator === 'inclusion') {
      return `configuration attribute "${
        error.attribute
      }" must be one of the following: ${error.options.map((o: any) => `"${o}"`).join(', ')}`
    }
    if (error.validator === 'numericality') {
      const isIndex = error.error.indexOf(' is')
      const msg = error.error.substring(isIndex + 1)
      return `configuration attribute "${error.attribute}" ${msg}`
    }
    if ('undefined' === typeof error.options.message) {
      if (error.validator === 'presence') {
        return `configuration attribute "${error.attribute}" is required`
      }
      console.log(error)
    }
    return `configuration attribute "${error.attribute}" ${error.options.message}`
  })
}
validate['options'] = { format: 'rmqbq' }

function addCustomType(name: string, type: ValidationType, message?: ValidationMessage) {
  validate.validators.type.types[name] = type
  if ('string' === typeof message && message.trim().length > 0) {
    validate.validators.type.messages[name] = message.trim()
  }
}

addCustomType('queue', QueueType, 'is not a rabbitmq channel or confirmChannel')
addCustomType('rmqConnectionOptions', RmqConnectionOptionsType)
addCustomType('rmqQueueOptionsType', RmqQueueOptionsType)
addCustomType('rmqCoordinatorType', RmqCoordinatorType)
addCustomType('redisOptions', redisOptions)
addCustomType('mqttOptions', mqttOptions)
addCustomType('databaseOptions', databaseOptions)
addCustomType('databaseConnectionOptions', databaseConnectionOptions)
addCustomType('loggerOptions', loggerOptions)
addCustomType('callable', callable)
addCustomType('undefined', undefinedType)

export default validate
