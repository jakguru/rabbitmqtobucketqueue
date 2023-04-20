import * as options from '../common'
import amqplib from 'amqplib'
import { MakeConfigForCoordinator } from './variations'

export class BaseConfig {
  public readonly connection: Promise<amqplib.Connection>
  public channel: Promise<amqplib.Channel>
  public confirmChannel: Promise<amqplib.ConfirmChannel>
  public readonly config: any = {
    queue: 'test-queue',
    debug: false,
    rmqChannel: undefined as undefined | Promise<amqplib.Channel | amqplib.ConfirmChannel>,
    rmqConfirmChannel: undefined as undefined | Promise<amqplib.Channel | amqplib.ConfirmChannel>,
    rmqQueueType: 'queue',
    rmqConnectionOptions: options.amqplibConnectionOptions,
    rmqQueueOptions: {
      durable: false,
      autoDelete: true,
    },
    coordinator: 'memory',
    redisOptions: options.redisConnectionOptions,
    mqttOptions: options.mqttConnectionOptions,
    databaseOptions: options.sqlite3ConnectionOptions,
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

  constructor() {
    this.connection = amqplib.connect(options.amqplibConnectionOptions)
    this.connection.then((connection) => {
      this.channel = connection.createChannel()
      this.confirmChannel = connection.createConfirmChannel()
      this.config.rmqChannel = this.channel
      this.config.rmqConfirmChannel = this.confirmChannel
    })
  }
}
export async function ResolveConfig(config: any) {
  if (config.rmqChannel) {
    config.rmqChannel = await config.rmqChannel
  }
  if (config.rmqConfirmChannel) {
    config.rmqConfirmChannel = await config.rmqConfirmChannel
  }
  return config
}
export const baseConfig = new BaseConfig()
export const variationConfigurations: any = {}
variationConfigurations['On Spill + Memory Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'memory', true, false)
variationConfigurations['On Spill + Memory Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'memory',
    true,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Spill + Memory Coordinator + New Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'memory',
  true,
  true
)
variationConfigurations['On Spill + Memory Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'memory', true, 'confirmChannel')
variationConfigurations['On Spill + Redis Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'redis', true, false)
variationConfigurations['On Spill + Redis Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'redis',
    true,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Spill + Redis Coordinator + New Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'redis',
  true,
  true
)
variationConfigurations['On Spill + Redis Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'redis', true, 'confirmChannel')
variationConfigurations['On Spill + MQTT Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'mqtt', true, false)
variationConfigurations['On Spill + MQTT Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'mqtt',
    true,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Spill + MQTT Coordinator + New Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'mqtt',
  true,
  true
)
variationConfigurations['On Spill + MQTT Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'mqtt', true, 'confirmChannel')
variationConfigurations['On Spill + sqlite3 Database Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'database', true, false)
variationConfigurations['On Spill + sqlite3 Database Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Spill + sqlite3 Database Coordinator + New Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'database', true, true)
variationConfigurations['On Spill + sqlite3 Database Coordinator + New Confirmation Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'database', true, 'confirmChannel')
variationConfigurations['On Spill + PostgreSQL Database Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    false,
    options.postgresConnectionOptions
  )
variationConfigurations['On Spill + PostgreSQL Database Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    false,
    options.postgresConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Spill + PostgreSQL Database Coordinator + New Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    true,
    options.postgresConnectionOptions
  )
variationConfigurations['On Spill + PostgreSQL Database Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    'confirmChannel',
    options.postgresConnectionOptions
  )
variationConfigurations['On Spill + MySQL Database Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    false,
    options.mysqlConnectionOptions
  )
variationConfigurations['On Spill + MySQL Database Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    false,
    options.mysqlConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Spill + MySQL Database Coordinator + New Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    true,
    options.mysqlConnectionOptions
  )
variationConfigurations['On Spill + MySQL Database Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    true,
    'confirmChannel',
    options.mysqlConnectionOptions
  )
variationConfigurations['On Item + Memory Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'memory', false, false)
variationConfigurations['On Item + Memory Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'memory',
    false,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Item + Memory Coordinator + New Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'memory',
  false,
  true
)
variationConfigurations['On Item + Memory Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'memory', false, 'confirmChannel')
variationConfigurations['On Item + Redis Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'redis', false, false)
variationConfigurations['On Item + Redis Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'redis',
    false,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Item + Redis Coordinator + New Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'redis',
  false,
  true
)
variationConfigurations['On Item + Redis Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'redis', false, 'confirmChannel')
variationConfigurations['On Item + MQTT Coordinator + Provided Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'mqtt',
  false,
  false
)
variationConfigurations['On Item + MQTT Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'mqtt',
    false,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Item + MQTT Coordinator + New Channel'] = MakeConfigForCoordinator(
  baseConfig.config,
  'mqtt',
  false,
  true
)
variationConfigurations['On Item + MQTT Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'mqtt', false, 'confirmChannel')
variationConfigurations['On Item + sqlite3 Database Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'database', false, false)
variationConfigurations['On Item + sqlite3 Database Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    false,
    options.sqlite3ConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Item + sqlite3 Database Coordinator + New Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'database', false, true)
variationConfigurations['On Item + sqlite3 Database Coordinator + New Confirmation Channel'] =
  MakeConfigForCoordinator(baseConfig.config, 'database', false, 'confirmChannel')
variationConfigurations['On Item + PostgreSQL Database Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    false,
    options.postgresConnectionOptions
  )
variationConfigurations['On Item + PostgreSQL Database Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    false,
    options.postgresConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Item + PostgreSQL Database Coordinator + New Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    true,
    options.postgresConnectionOptions
  )
variationConfigurations['On Item + PostgreSQL Database Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    'confirmChannel',
    options.postgresConnectionOptions
  )
variationConfigurations['On Item + MySQL Database Coordinator + Provided Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    false,
    options.mysqlConnectionOptions
  )
variationConfigurations['On Item + MySQL Database Coordinator + Provided Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    false,
    options.mysqlConnectionOptions,
    baseConfig.config.rmqConfirmChannel
  )
variationConfigurations['On Item + MySQL Database Coordinator + New Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    true,
    options.mysqlConnectionOptions
  )
variationConfigurations['On Item + MySQL Database Coordinator + New Confirm Channel'] =
  MakeConfigForCoordinator(
    baseConfig.config,
    'database',
    false,
    'confirmChannel',
    options.mysqlConnectionOptions
  )
