import { test } from '@japa/runner'
import * as options from '../common'
import amqplib from 'amqplib'
import pino from 'pino'
import { RabbitMQToBucketQueue } from '../../src/RabbitMQToBucketQueue'
import { ValidationError } from '../../src/validation/ValidationError'
import { MakeConfigForCoordinator, GetBadValuesForKey } from './variations'

const Logger = pino({
  timestamp: true,
  level: 'info',
  enabled: true,
  module: `Test`,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
})

test.group('RabbitMQToBucketQueue', (group) => {
  group.tap((test) => test.tags(['rmqbq']))
  let connection: amqplib.Connection | undefined
  const baseConfig = {
    queue: 'test-queue',
    rmqChannel: undefined as undefined | amqplib.Channel | amqplib.ConfirmChannel,
    rmqConfirmChannel: undefined as undefined | amqplib.Channel | amqplib.ConfirmChannel,
    rmqQueueType: 'channel',
    rmqConnectionOptions: options.amqplibConnectionOptions,
    rmqQueueOptions: {
      durable: false,
      autoDelete: true,
    },
    coordinator: 'memory',
    redisOptions: options.redisConnectionOptions,
    mqttOptions: options.mqttConnectionOptions,
    databaseOptions: options.sqlite3ConnectionOptions,
    debug: false,
    interval: 1000,
    maxBatch: 4,
    chunkSize: 1,
    discardOnDeserializeError: true,
    discardOnValidationError: true,
    discardOnInvalid: true,
    validateItem: async () => {
      return true
    },
    deserializeItem: async (buffer) => {
      return buffer.toString()
    },
    onSpill: async () => {
      return await new Promise((resolve) => setTimeout(resolve, 1000))
    },
    onItem: async () => {
      return await new Promise((resolve) => setTimeout(resolve, 1000))
    },
  }
  const variationConfigurations: any = {}
  group.setup(async () => {
    try {
      connection = await amqplib.connect(
        options.amqplibConnectionOptions,
        options.amqplibConnectionSocketOptions
      )
      if (connection instanceof Error) {
        throw connection
      }
      baseConfig.rmqChannel = await connection.createChannel()
      Logger.info(`Connected to RabbitMQ`)
    } catch (error) {
      Logger.error(`Failed to create a connection to RabbitMQ: ${error.message}`)
      return
    }
    variationConfigurations['On Spill + Memory Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'memory', true, false)
    variationConfigurations['On Spill + Memory Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'memory',
        true,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Spill + Memory Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'memory', true, true)
    variationConfigurations['On Spill + Memory Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(baseConfig, 'memory', true, 'confirmChannel')
    variationConfigurations['On Spill + Redis Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'redis', true, false)
    variationConfigurations['On Spill + Redis Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'redis',
        true,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Spill + Redis Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'redis', true, true)
    variationConfigurations['On Spill + Redis Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(baseConfig, 'redis', true, 'confirmChannel')
    variationConfigurations['On Spill + MQTT Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'mqtt', true, false)
    variationConfigurations['On Spill + MQTT Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'mqtt',
        true,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Spill + MQTT Coordinator + New Channel'] = MakeConfigForCoordinator(
      baseConfig,
      'mqtt',
      true,
      true
    )
    variationConfigurations['On Spill + MQTT Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(baseConfig, 'mqtt', true, 'confirmChannel')
    variationConfigurations['On Spill + sqlite3 Database Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', true, false)
    variationConfigurations['On Spill + sqlite3 Database Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        true,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Spill + sqlite3 Database Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', true, true)
    variationConfigurations['On Spill + sqlite3 Database Coordinator + New Confirmation Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', true, 'confirmChannel')
    variationConfigurations['On Spill + PostgreSQL Database Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        true,
        false,
        options.postgresConnectionOptions
      )
    variationConfigurations[
      'On Spill + PostgreSQL Database Coordinator + Provided Confirm Channel'
    ] = MakeConfigForCoordinator(
      baseConfig,
      'database',
      true,
      false,
      options.postgresConnectionOptions,
      baseConfig.rmqConfirmChannel
    )
    variationConfigurations['On Spill + PostgreSQL Database Coordinator + New Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        true,
        true,
        options.postgresConnectionOptions
      )
    variationConfigurations['On Spill + PostgreSQL Database Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        true,
        'confirmChannel',
        options.postgresConnectionOptions
      )
    variationConfigurations['On Spill + MySQL Database Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', true, false, options.mysqlConnectionOptions)
    variationConfigurations['On Spill + MySQL Database Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        true,
        false,
        options.mysqlConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Spill + MySQL Database Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', true, true, options.mysqlConnectionOptions)
    variationConfigurations['On Spill + MySQL Database Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        true,
        'confirmChannel',
        options.mysqlConnectionOptions
      )
    variationConfigurations['On Item + Memory Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'memory', false, false)
    variationConfigurations['On Item + Memory Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'memory',
        false,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Item + Memory Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'memory', false, true)
    variationConfigurations['On Item + Memory Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(baseConfig, 'memory', false, 'confirmChannel')
    variationConfigurations['On Item + Redis Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'redis', false, false)
    variationConfigurations['On Item + Redis Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'redis',
        false,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Item + Redis Coordinator + New Channel'] = MakeConfigForCoordinator(
      baseConfig,
      'redis',
      false,
      true
    )
    variationConfigurations['On Item + Redis Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(baseConfig, 'redis', false, 'confirmChannel')
    variationConfigurations['On Item + MQTT Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'mqtt', false, false)
    variationConfigurations['On Item + MQTT Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'mqtt',
        false,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Item + MQTT Coordinator + New Channel'] = MakeConfigForCoordinator(
      baseConfig,
      'mqtt',
      false,
      true
    )
    variationConfigurations['On Item + MQTT Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(baseConfig, 'mqtt', false, 'confirmChannel')
    variationConfigurations['On Item + sqlite3 Database Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', false, false)
    variationConfigurations['On Item + sqlite3 falsese Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        false,
        false,
        options.sqlite3ConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Item + sqlite3 Database Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', false, true)
    variationConfigurations['On Item + sqlite3 falsese Coordinator + New Confirmation Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', false, 'confirmChannel')
    variationConfigurations['On Item + PostgreSQL falseabase Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        false,
        false,
        options.postgresConnectionOptions
      )
    variationConfigurations[
      'On Item + PostgreSQL Database Coordinator + Provided Confirm Channel'
    ] = MakeConfigForCoordinator(
      baseConfig,
      'database',
      false,
      false,
      options.postgresConnectionOptions,
      baseConfig.rmqConfirmChannel
    )
    variationConfigurations['On Item + PostgreSQL Database Coordinator + New Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        false,
        true,
        options.postgresConnectionOptions
      )
    variationConfigurations['On Item + PostgreSQL Database Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        false,
        'confirmChannel',
        options.postgresConnectionOptions
      )
    variationConfigurations['On Item + MySQL Database Coordinator + Provided Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', false, false, options.mysqlConnectionOptions)
    variationConfigurations['On Item + MySQL false Coordinator + Provided Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        false,
        false,
        options.mysqlConnectionOptions,
        baseConfig.rmqConfirmChannel
      )
    variationConfigurations['On Item + MySQL Database Coordinator + New Channel'] =
      MakeConfigForCoordinator(baseConfig, 'database', false, true, options.mysqlConnectionOptions)
    variationConfigurations['On Item + MySQL false Coordinator + New Confirm Channel'] =
      MakeConfigForCoordinator(
        baseConfig,
        'database',
        false,
        'confirmChannel',
        options.mysqlConnectionOptions
      )
  })
  group.teardown(async () => {
    if (connection) {
      Logger.info(`Closing connection to RabbitMQ`)
      await connection.close()
      return
    } else {
      Logger.info(`No connection to RabbitMQ to close`)
      return
    }
  })

  test('Validation Errors are thrown when there is no configuration, or the configuration is not an object', async ({
    assert,
  }) => {
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize()
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(true)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(0)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize('test')
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize([])
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(null)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(undefined)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(void 0)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(() => {})
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
    }
  })

  test('Validation Errors are thrown when there is a conflicting configuration', async ({
    assert,
  }) => {
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(baseConfig)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      assert.deepEqual(error.errors, ['onSpill and onItem cannot be defined at the same time'])
    }
  })

  test('Validation Errors are thrown when there are issues with the configuration, but not when there are no issues.', async ({
    assert,
  }) => {
    const subtests = Object.keys(variationConfigurations)
    for (let i = 0; i < subtests.length; i++) {
      const test = subtests[i]
      const full = variationConfigurations[test]
      const toTest: any = {}
      try {
        // @ts-ignore
        await RabbitMQToBucketQueue.initialize(toTest)
        assert.fail('Should have thrown an error')
      } catch (error) {
        assert.instanceOf(error, ValidationError)
        assert.deepEqual(error.errors, [
          'configuration attribute "queue" must be of type string',
          'configuration attribute "debug" must be of type boolean',
        ])
      }
      for (const key in full) {
        const badValues = [...GetBadValuesForKey(key)]
        for (let bi = 0; bi < badValues.length; bi++) {
          const bad = badValues[bi]
          toTest[key] = bad
          try {
            // @ts-ignore
            const instance = await RabbitMQToBucketQueue.initialize(Object.assign({}, toTest))
            if (Object.keys(toTest).length !== Object.keys(full).length) {
              assert.fail('Should have thrown an error')
            } else {
              assert.instanceOf(instance, RabbitMQToBucketQueue)
              await instance.shutdown()
            }
          } catch (error) {
            if (!(error instanceof ValidationError)) {
              console.log(error)
            }
            assert.instanceOf(error, ValidationError)
            console.log(toTest, error.errors)
          }
        }
        toTest[key] = full[key]
        try {
          // @ts-ignore
          const instance = await RabbitMQToBucketQueue.initialize(Object.assign({}, toTest))
          if (Object.keys(toTest).length !== Object.keys(full).length) {
            assert.fail('Should have thrown an error')
          } else {
            assert.instanceOf(instance, RabbitMQToBucketQueue)
            await instance.shutdown()
          }
        } catch (error) {
          if (!(error instanceof ValidationError)) {
            console.log(error)
          }
          assert.instanceOf(error, ValidationError)
          console.log(toTest, error.errors)
        }
      }
    }
  })
})
