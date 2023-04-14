import type { CoordinatorDriver } from './CoordinatorDriver'
import type { RedisOptions as IORedisOptions } from 'ioredis'
import type { IClientOptions as MQTTBaseOptions } from 'mqtt'
import type { Knex } from 'knex'
import type { LoggerOptions } from 'pino'
import type amqplib from 'amqplib'

export interface RedisOptions extends IORedisOptions {}

export interface MQTTOptions extends MQTTBaseOptions {
  protocol: 'mqtt' | 'wss' | 'ws' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs'
  host: string
  port: number
}

export interface DatabaseOptions extends Knex.Config {
  table: string
  client: 'pg' | 'sqlite3' | 'mssql' | 'mysql' | 'mysql2' | 'oracledb'
}

export interface RabbitMQConnectionOptions extends amqplib.Options.Connect {}

export interface RabbitMQQueue extends amqplib.Channel {}

export interface RabbitMQConfirmQueue extends amqplib.ConfirmChannel {}

export interface RabbitMQQueueOptions extends amqplib.Options.AssertQueue {}

/**
 * Defines a callback function for handling spilled items in the queue.
 * @typeParam T Type of items in the queue.
 * @param items An array of items that spilled.
 * @returns A void or a promise resolving to void.
 */
export interface SpillCallback<T = any> {
  (items: T[]): void | Promise<void>
}

/**
 * Defines a callback function for handling individual items in the queue.
 * @typeParam T Type of items in the queue.
 * @param item An item in the queue.
 * @returns A void or a promise resolving to void.
 */
export interface ItemCallback<T = any> {
  (item: T): void | Promise<void>
}

/**
 * Defines a callback function for validating individual items before entering the queue.
 * @typeParam T Type of items in the queue.
 * @param item An item in the queue.
 * @returns A void or a promise resolving to void.
 */
export interface ItemValidator<T = any> {
  (item: T): void | Promise<boolean>
}

/**
 * Defines a callback function for converting an item from a buffer to a typed item
 * @typeParam T The type the item should be converted to.
 * @param buffer The original contents of the message.
 * @returns A typed item or a promise resolving to a typed item.
 */
export interface ItemDeserializer<T = any> {
  (buffer: Buffer): T | Promise<T>
}

export interface Config<T = Buffer> {
  queue: string
  rmqChannel?: RabbitMQQueue | RabbitMQConfirmQueue
  rmqQueueType?: 'channel' | 'confirmChannel'
  rmqConnectionOptions?: RabbitMQConnectionOptions
  rmqQueueOptions?: RabbitMQQueueOptions
  coordinator: CoordinatorDriver | 'memory' | 'redis' | 'mqtt' | 'database'
  redisOptions?: RedisOptions
  mqttOptions?: MQTTOptions
  databaseOptions?: DatabaseOptions
  debug: boolean
  loggerOptions?: LoggerOptions
  interval: number
  minBatch: number
  maxBatch: number
  chunkSize: number
  autostart?: boolean
  onSpill?: SpillCallback<T>
  onItem?: ItemCallback<T>
  validateItem?: ItemValidator<T>
  deserializeItem?: ItemDeserializer<T>
}

export interface GetRabbitMQQueueOptions {
  queue: string
  rmqQueueType: 'channel' | 'confirmChannel'
  rmqConnectionOptions: RabbitMQConnectionOptions
  rmqQueueOptions: RabbitMQQueueOptions
}

export type DefaultOptions<T = Buffer> = Omit<
  Config<T>,
  'queue' | 'onSpill' | 'onItem' | 'validateItem' | 'deserializeItem'
>

export type ConfigMergedWithDefaults<T = Buffer> = Partial<Config<T>> &
  Pick<
    Config<T>,
    | 'coordinator'
    | 'debug'
    | 'loggerOptions'
    | 'interval'
    | 'minBatch'
    | 'maxBatch'
    | 'autostart'
    | 'chunkSize'
  >

export type { IClientOptions as MQTTBaseOptions } from 'mqtt'
export type { LoggerOptions } from 'pino'
export type { Knex } from 'knex'
