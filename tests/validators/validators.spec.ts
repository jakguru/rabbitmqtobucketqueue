import { test } from '@japa/runner'
import validator from '../../src/validation'
import QueueType from '../../src/validation/types/queue'
import RmqConnectionOptionsType from '../../src/validation/types/rmqConnectionOptions'
import RmqQueueOptionsType from '../../src/validation/types/rmqQueueOptions'
import RmqCoordinatorType from '../../src/validation/types/coordinator'
import redisOptionsType from '../../src/validation/types/redisOptions'
import mqttOptionsType from '../../src/validation/types/mqttOptions'
import databaseOptionsType from '../../src/validation/types/databaseOptions'
import databaseConnectionOptionsType from '../../src/validation/types/databaseConnectionOptions'
import loggerOptionsType from '../../src/validation/types/loggerOptions'
import callableType from '../../src/validation/types/callable'
import undefinedType from '../../src/validation/types/undefined'
import * as options from '../common'
import amqplib from 'amqplib'

test.group('Validator', (group) => {
  group.tap((test) => test.tags(['validator']))

  test('Type function QueueType returns correct feedback', async ({ assert }) => {
    const connection = await amqplib.connect(options.amqplibConnectionOptions)
    const shouldPass = QueueType(await connection.createChannel())
    const shouldFail = QueueType('')
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
    await connection.close()
  })

  test('Type function RmqConnectionOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = RmqConnectionOptionsType(options.amqplibConnectionOptions)
    const shouldFail = RmqConnectionOptionsType({})
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function RmqQueueOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = RmqQueueOptionsType({
      durable: false,
      autoDelete: true,
    })
    const shouldFail = RmqQueueOptionsType({
      maxPriority: 256,
    })
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function RmqCoordinatorType returns correct feedback', ({ assert }) => {
    const shouldPass = RmqCoordinatorType('redis')
    const shouldFail = RmqCoordinatorType('')
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function redisOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = redisOptionsType(options.redisConnectionOptions)
    const shouldFail = redisOptionsType({})
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function mqttOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = mqttOptionsType(options.mqttConnectionOptions)
    const shouldFail = mqttOptionsType({})
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function databaseConnectionOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = databaseConnectionOptionsType({
      foo: 'bar',
    })
    const shouldFail = databaseConnectionOptionsType(undefined)
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function databaseOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = databaseOptionsType(options.postgresConnectionOptions)
    const shouldFail = databaseOptionsType({})
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function loggerOptionsType returns correct feedback', ({ assert }) => {
    const shouldPass = loggerOptionsType({
      foo: 'bar',
    })
    const shouldFail = loggerOptionsType(undefined)
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function callableType returns correct feedback', ({ assert }) => {
    class StdClass {}
    const shouldPass = callableType(() => {})
    const shouldFail = callableType(new StdClass())
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type function undefinedType returns correct feedback', ({ assert }) => {
    const shouldPass = undefinedType(undefined)
    const shouldFail = undefinedType('')
    assert.isTrue(shouldPass)
    assert.isString(shouldFail)
  })

  test('Type validation callable validates correctly', ({ assert }) => {
    class StdClass {}
    const shouldPass = () => {}
    const shouldFail = new StdClass()
    const shouldBePassing = validator.single(shouldPass, { type: 'callable' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'callable' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation coordinator validates correctly', ({ assert }) => {
    const shouldPass = 'redis'
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { type: 'rmqCoordinatorType' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'rmqCoordinatorType' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation databaseConnectionOptions validates correctly', ({ assert }) => {
    const shouldPass = Object.assign({}, options.postgresConnectionOptions)
    const shouldFail = Object.assign({}, options.postgresConnectionOptions, {
      connection: {},
    })
    const shouldBePassing = validator.single(shouldPass, { type: 'databaseOptions' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'databaseOptions' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation databaseOptions validates correctly', ({ assert }) => {
    const shouldPass = options.postgresConnectionOptions
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { type: 'databaseOptions' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'databaseOptions' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation loggerOptions validates correctly', ({ assert }) => {
    const shouldPass = { foo: 'bar' }
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { type: 'loggerOptions' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'loggerOptions' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation mqttOptions validates correctly', ({ assert }) => {
    const shouldPass = options.mqttConnectionOptions
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { type: 'mqttOptions' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'mqttOptions' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation queue validates correctly', async ({ assert }) => {
    const connection = await amqplib.connect(options.amqplibConnectionOptions)
    const shouldPass = await connection.createChannel()
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { type: 'queue' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'queue' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
    await connection.close()
  })

  test('Type validation redisOptions validates correctly', ({ assert }) => {
    const shouldPass = options.redisConnectionOptions
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { type: 'redisOptions' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'redisOptions' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation rmqConnectionOptions validates correctly', ({ assert }) => {
    const shouldPass = options.amqplibConnectionOptions
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { type: 'rmqConnectionOptions' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'rmqConnectionOptions' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation rmqQueueOptions validates correctly', ({ assert }) => {
    const shouldPass = {}
    const shouldFail = { maxPriority: 256 }
    const shouldBePassing = validator.single(shouldPass, { type: 'rmqQueueOptionsType' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'rmqQueueOptionsType' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Type validation undefined validates correctly', ({ assert }) => {
    const shouldPass = undefined
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { type: 'undefined' })
    const shouldBeFailing = validator.single(shouldFail, { type: 'undefined' })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator callable validates correctly', ({ assert }) => {
    class StdClass {}
    const shouldPass = () => {}
    const shouldFail = new StdClass()
    const shouldBePassing = validator.single(shouldPass, { callable: true })
    const shouldBeFailing = validator.single(shouldFail, { callable: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator coordinator validates correctly', ({ assert }) => {
    const shouldPass = 'redis'
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { rmqCoordinatorType: true })
    const shouldBeFailing = validator.single(shouldFail, { rmqCoordinatorType: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator databaseConnectionOptions validates correctly', ({ assert }) => {
    const shouldPass = Object.assign({}, options.postgresConnectionOptions)
    const shouldFail = Object.assign({}, options.postgresConnectionOptions, {
      connection: {},
    })
    const shouldBePassing = validator.single(shouldPass, { databaseOptions: true })
    const shouldBeFailing = validator.single(shouldFail, { databaseOptions: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator databaseOptions validates correctly', ({ assert }) => {
    const shouldPass = options.postgresConnectionOptions
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { databaseOptions: true })
    const shouldBeFailing = validator.single(shouldFail, { databaseOptions: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator loggerOptions validates correctly', ({ assert }) => {
    const shouldPass = { foo: 'bar' }
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { loggerOptions: true })
    const shouldBeFailing = validator.single(shouldFail, { loggerOptions: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator mqttOptions validates correctly', ({ assert }) => {
    const shouldPass = options.mqttConnectionOptions
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { mqttOptions: true })
    const shouldBeFailing = validator.single(shouldFail, { mqttOptions: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator queue validates correctly', async ({ assert }) => {
    const connection = await amqplib.connect(options.amqplibConnectionOptions)
    const shouldPass = await connection.createChannel()
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { queue: true })
    const shouldBeFailing = validator.single(shouldFail, { queue: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
    await connection.close()
  })

  test('Validator redisOptions validates correctly', ({ assert }) => {
    const shouldPass = options.redisConnectionOptions
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { redisOptions: true })
    const shouldBeFailing = validator.single(shouldFail, { redisOptions: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator rmqConnectionOptions validates correctly', ({ assert }) => {
    const shouldPass = options.amqplibConnectionOptions
    const shouldFail = {}
    const shouldBePassing = validator.single(shouldPass, { rmqConnectionOptions: true })
    const shouldBeFailing = validator.single(shouldFail, { rmqConnectionOptions: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator rmqQueueOptions validates correctly', ({ assert }) => {
    const shouldPass = {}
    const shouldFail = { maxPriority: 256 }
    const shouldBePassing = validator.single(shouldPass, { rmqQueueOptionsType: true })
    const shouldBeFailing = validator.single(shouldFail, { rmqQueueOptionsType: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })

  test('Validator undefined validates correctly', ({ assert }) => {
    const shouldPass = undefined
    const shouldFail = ''
    const shouldBePassing = validator.single(shouldPass, { undefined: true })
    const shouldBeFailing = validator.single(shouldFail, { undefined: true })
    assert.isUndefined(shouldBePassing)
    assert.isArray(shouldBeFailing)
  })
})
