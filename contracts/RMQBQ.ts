import type { EventEmitter } from 'events'
import type { CoordinatorDriver } from './CoordinatorDriver'
import type { RedisOptions as IORedisOptions } from 'ioredis'
import type { IClientOptions as MQTTBaseOptions } from 'mqtt'
import type { Knex } from 'knex'
import type { LoggerOptions as PinoLoggerOptions } from 'pino'
import type amqplib from 'amqplib'

export interface LoggerOptions extends PinoLoggerOptions {}

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

export type DefaultCoordinatorOptions = RedisOptions | MQTTOptions | DatabaseOptions | undefined

export interface RabbitMQConnectionOptions extends amqplib.Options.Connect {}

export interface RabbitMQConnection extends amqplib.Connection {}

export interface RabbitMQQueue extends amqplib.Channel {}

export interface RabbitMQConfirmQueue extends amqplib.ConfirmChannel {}

export interface RabbitMQQueueOptions extends amqplib.Options.AssertQueue {}

export interface RabbitMQMessageFields extends amqplib.GetMessageFields {}

export interface RabbitMQMessageProperties extends amqplib.MessageProperties {}

export interface RabbitMQMessage extends amqplib.GetMessage {
  content: Buffer
  fields: RabbitMQMessageFields
  properties: RabbitMQMessageProperties
}

export interface DeserializedMessage<T = any> {
  message: RabbitMQMessage
  item: T
}

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
  maxBatch: number
  chunkSize: number
  autostart?: boolean
  onSpill?: SpillCallback<T>
  onItem?: ItemCallback<T>
  validateItem?: ItemValidator<T>
  deserializeItem?: ItemDeserializer<T>
  /**
   * Whether to discard or reenqueue messages throw an error when trying to deserialize.
   */
  discardOnDeserializeError: boolean
  /**
   * Whether to discard or reenqueue messages throw an error when trying to validate.
   */
  discardOnValidationError: boolean
  /**
   * Whether to discard or reenqueue messages that fail to validate.
   */
  discardOnInvalid: boolean
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
    | 'maxBatch'
    | 'autostart'
    | 'chunkSize'
    | 'discardOnDeserializeError'
    | 'discardOnValidationError'
    | 'discardOnInvalid'
  >

export interface EventHandlers<T = any> {
  /**
   * Handles the `corked` event, which is triggered when the queue is corked (paused).
   * @returns A void or a promise resolving to void.
   */
  corked: () => void | Promise<void>
  /**
   * Handles the `drain` event, which is triggered when the queue is drained (partially emptied).
   * @returns A void or a promise resolving to void.
   */
  drain: () => void | Promise<void>
  /**
   * Handles the `error` event, which is triggered when an error occurs.
   * @returns A void or a promise resolving to void.
   */
  error: (error: Error, info?: RabbitMQMessage | T[] | T | any | any[]) => void | Promise<void>
  /**
   * Handles the `fatal` event, which is triggered when the queue encounters a fatal error which prevents it from running.
   * @param error The error which was encountered.
   * @returns A void or a promise resolving to void.
   */
  fatal: (error: Error) => void | Promise<void>
  /**
   * Handles the `died` event, which is triggered after a fatal event occurs and the queue is no longer running.
   * @param error The error which caused the queue to die.
   * @returns A void or a promise resolving to void.
   */
  died: (error: Error) => void | Promise<void>
  /**
   * Handles the `finish` event, which is triggered when the queue is finished (completely emptied).
   * @returns A void or a promise resolving to void.
   */
  finish: () => void | Promise<void>
  /**
   * Handles the `invalid` event, which is triggered when an item fails to validate.
   * @param item The item that failed to validate.
   * @param message The RabbitMQ message of the item that failed to validate.
   * @returns A void or a promise resolving to void.
   */
  invalid: (item: T | undefined, message: RabbitMQMessage) => void | Promise<void>
  /**
   * Handles the `spill` event, which is triggered when the there is a balance of items which can be spilled.
   * @param timestamp The timestamp of the spill.
   * @param balance The number of items which will be spilled.
   * @returns A void or a promise resolving to void.
   */
  spill: (timestamp: number, balance: number) => void | Promise<void>
  /**
   * Handles the `tick` event, which is a looped event which is run back to back until corked (paused).
   * @param timestamp The timestamp of the tick.
   * @param balance The number of items available to be spilled.
   * @returns A void or a promise resolving to void.
   */
  tick: (timestamp: number, balance: number) => void | Promise<void>
  /**
   * Handles the `uncorked` event, which is triggered when the queue is uncorked (resumed).
   * @returns A void or a promise resolving to void.
   */
  uncorked: () => void | Promise<void>
}

export interface RabbitMQToBucketQueueEmitter<T = any> extends EventEmitter {
  on<U extends keyof EventHandlers<T>>(event: U, listener: EventHandlers<T>[U]): this
  once<U extends keyof EventHandlers<T>>(event: U, listener: EventHandlers<T>[U]): this
  off<U extends keyof EventHandlers<T>>(event: U, listener: EventHandlers<T>[U]): this
  emit<U extends keyof EventHandlers<T>>(
    event: U,
    ...args: Parameters<EventHandlers<T>[U]>
  ): boolean
  addListener<U extends keyof EventHandlers<T>>(event: U, listener: EventHandlers<T>[U]): this
  prependListener<U extends keyof EventHandlers<T>>(event: U, listener: EventHandlers<T>[U]): this
  prependOnceListener<U extends keyof EventHandlers<T>>(
    event: U,
    listener: EventHandlers<T>[U]
  ): this
}

export type RabbitMQToBucketQueueEmitterEvent = {
  [key in keyof EventHandlers]: string
}

export type { IClientOptions as MQTTBaseOptions } from 'mqtt'
