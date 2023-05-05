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
import liteOptions from './types/liteOptions'
import validate from 'validate.js'

import type { ValidationType, ValidationMessage } from '../../contracts/validation'
// @ts-ignore
validate.capitalize = (v) => v
// @ts-ignore
validate.prettify = (v) => v
validate['options'] = { format: 'flat' }
validate.validators.exists = (value, options) => {
  if (typeof value === 'undefined') {
    return options.message || 'is required'
  }
}

function addCustomType(name: string, type: ValidationType, message?: ValidationMessage) {
  validate.validators.type.types[name] = (value) => {
    return 'string' !== typeof type(value)
  }
  validate.validators[name] = (value) => {
    const res = type(value)
    return 'string' === typeof res ? res : undefined
  }
  if ('string' === typeof message && message.trim().length > 0) {
    validate.validators.type.messages[name] = message.trim()
  }
}

addCustomType('queue', QueueType, 'is not a rabbitmq channel or confirmChannel')
addCustomType(
  'rmqConnectionOptions',
  RmqConnectionOptionsType,
  'does not match interface RabbitMQConnectionOptions'
)
addCustomType(
  'rmqQueueOptionsType',
  RmqQueueOptionsType,
  'does not match interface RabbitMQQueueOptions'
)
addCustomType('rmqCoordinatorType', RmqCoordinatorType, 'is not a valid Coordinator Driver')
addCustomType('redisOptions', redisOptions, 'does not match interface RedisOptions')
addCustomType('mqttOptions', mqttOptions, 'does not match interface MQTTOptions')
addCustomType('databaseOptions', databaseOptions, 'does not match interface DatabaseOptions')
addCustomType(
  'databaseConnectionOptions',
  databaseConnectionOptions,
  'is not a valid database connection configuration object'
)
addCustomType('loggerOptions', loggerOptions, 'is not a valid logger configuration')
addCustomType('callable', callable, 'is not a callable function')
addCustomType('undefined', undefinedType, 'is defined')
addCustomType('liteOptions', liteOptions, 'does not match interface LiteOptions')

export default validate
