import { EventEmitter } from 'events'
import { inspect } from 'util'
import merge from 'lodash.merge'
import amqplib from 'amqplib'
import validator from './validation'
import { Channel } from 'amqplib/lib/channel_model'
import { CoordinatorDriverBase } from '../abstracts'
import {
  DatabaseCoordinator,
  MemoryCoordinator,
  MQTTCoordinator,
  RedisCoordinator,
} from '../src/coordinators'
import pino from 'pino'
import { ReEnquableError } from '../extendables'
import { ValidationError } from './validation/ValidationError'

import type { CoordinatorDriver } from '../contracts/CoordinatorDriver'
import type { Logger } from 'pino'
import type * as RMQBQ from '../contracts/RMQBQ'

const DefaultOptions: RMQBQ.DefaultOptions = {
  coordinator: 'memory',
  debug: true,
  loggerOptions: {
    timestamp: true,
    level: 'info',
    enabled: true,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
  interval: 1000,
  maxBatch: 50,
  autostart: true,
  chunkSize: 1000000,
  discardOnDeserializeError: true,
  discardOnValidationError: true,
  discardOnInvalid: true,
}

/**
 * RabbitMQToBucketQueue is a RabbitMQ Consumer which limits the rate of consumption by consuming small batches of messages periodically and releasing them.
 * @typeParam T The type of the items in the bucket. Defaults to Buffer. You should change this to the type of the item you create using the {@link Config.deserializeItem} method.
 */
export class RabbitMQToBucketQueue<T = Buffer>
  extends EventEmitter
  implements RMQBQ.RabbitMQToBucketQueueEmitter<T>
{
  /**
   * The `corked` event, which is triggered when the queue is corked (paused).
   * @see {@link EventHandlers.corked | `corked` Event Handler}
   * @event
   */
  public static readonly corked: RMQBQ.RabbitMQToBucketQueueEmitterEvent['corked'] = 'corked'
  /**
   * The `uncorked` event, which is triggered when the queue is uncorked (resumed).
   * @see {@link EventHandlers.uncorked | `uncorked` Event Handler}
   * @event
   */
  public static readonly uncorked: RMQBQ.RabbitMQToBucketQueueEmitterEvent['uncorked'] = 'uncorked'
  /**
   * The `tick` event, which is a looped event which is run back to back until corked (paused).
   * @see {@link EventHandlers.tick | `tick` Event Handler}
   * @event
   */
  public static readonly tick: RMQBQ.RabbitMQToBucketQueueEmitterEvent['tick'] = 'tick'
  /**
   * The `spill` event, which is triggered when the there is a balance of items which can be spilled.
   * @see {@link EventHandlers.spill | `spill` Event Handler}
   * @event
   */
  public static readonly spill: RMQBQ.RabbitMQToBucketQueueEmitterEvent['spill'] = 'spill'
  /**
   * The `error` event, which is triggered when an error occurs.
   * @see {@link EventHandlers.error | `error` Event Handler}
   * @event
   */
  public static readonly error: RMQBQ.RabbitMQToBucketQueueEmitterEvent['error'] = 'error'
  /**
   * The `spill` event, which is triggered when the there is a balance of items which can be spilled.
   * @see {@link EventHandlers.invalid | `invalid` Event Handler}
   * @event
   */
  public static readonly invalid: RMQBQ.RabbitMQToBucketQueueEmitterEvent['invalid'] = 'invalid'
  /**
   * The `drain` event, which is triggered when the queue is drained (partially emptied).
   * @see {@link EventHandlers.drain | `drain` Event Handler}
   * @event
   */
  public static readonly drain: RMQBQ.RabbitMQToBucketQueueEmitterEvent['drain'] = 'drain'
  /**
   * The `invalid` event, which is triggered when an item fails to validate.
   * @see {@link EventHandlers.finish | `finish` Event Handler}
   * @event
   */
  public static readonly finish: RMQBQ.RabbitMQToBucketQueueEmitterEvent['finish'] = 'finish'
  #queue: string
  #maxBatch: number
  #chunkSize: number
  #discardOnDeserializeError: boolean = true
  #discardOnValidationError: boolean = true
  #discardOnInvalid: boolean = true
  #onSpill?: RMQBQ.SpillCallback<T>
  #onItem?: RMQBQ.ItemCallback<T>
  #validateItem?: RMQBQ.ItemValidator<T>
  #deserializeItem?: RMQBQ.ItemDeserializer<T>
  #logger: Logger
  #booted: boolean = false
  #channel: RMQBQ.RabbitMQQueue | RMQBQ.RabbitMQConfirmQueue
  #coordinator: CoordinatorDriver
  #immediate: NodeJS.Immediate | undefined
  #corked: boolean = false

  /**
   * @typeParam T The type of the items in the bucket. Defaults to Buffer. You should change this to the type of the item you create using the {@link Config.deserializeItem} method.
   */
  private constructor() {
    super({
      captureRejections: true,
    })
  }

  /**
   * A boolean indicating whether the Bucket Queue instance is booted.
   */
  public get booted(): boolean {
    return this.#booted
  }

  /**
   * A number representing the number of items in the Bucket Queue waiting to be spilled
   */
  public get balance(): number | Promise<number> {
    if (!this.#booted) {
      return Promise.resolve(0)
    }
    return this.#coordinator.balance
  }

  /**
   * Pause the BucketQueue by corking it, preventing any more events from processing.
   * @returns void
   */
  public cork() {
    clearImmediate(this.#immediate)
    this.#corked = true
    this.#storeAndEmit('corked')
    this.#logger.info(`Corked`)
  }

  /**
   * Resume the BucketQueue by uncorking it, allowing events to continue processing.
   * @returns void
   */
  public uncork() {
    this.#corked = false
    process.nextTick(() => this.#tick.bind(this))
    this.#storeAndEmit('uncorked')
    this.#logger.info(`Uncorked`)
  }

  /**
   * Alias for {@link BucketQueue.#cork}.
   * @returns void
   */
  public pause() {
    this.cork()
  }

  /**
   * Alias for {@link BucketQueue.#uncork}.
   * @returns void
   */
  public resume() {
    this.uncork()
  }

  /**
   * Empties the queue of all enqueued items.
   */
  public async purge(): Promise<void> {
    await this.#coordinator.reset()
  }

  /**
   * Shuts down all connections made by the Bucket Queue instance.
   * @remarks This method should allow the process to exit gracefully.
   * @param purge A boolean indicating whether the queue should be purged before closing.
   */
  public async shutdown(purge: boolean = false): Promise<void> {
    this.cork()
    await new Promise((resolve) => setImmediate(resolve))
    await new Promise((resolve) => setImmediate(resolve))
    if (purge) {
      await this.purge()
    }
    try {
      await this.#channel.close()
    } catch (error) {
      if (error.message !== 'Channel closed') {
        throw error
      }
    }
    await this.#coordinator.shutdown()
  }

  async #doBoot(config: Partial<RMQBQ.Config<T>>) {
    if ('object' !== typeof config || null === config) {
      throw new ValidationError('Missing configuration object', [
        'A configuration object is required',
      ])
    }
    if ('string' !== typeof config.queue || 'boolean' !== typeof config.debug) {
      const ers: string[] = []
      if ('string' !== typeof config.queue) {
        ers.push('configuration attribute "queue" must be of type string')
      }
      if ('boolean' !== typeof config.debug) {
        ers.push('configuration attribute "debug" must be of type boolean')
      }
      throw new ValidationError('Invalid configuration object', ers)
    }
    let options: RMQBQ.Config<T>
    try {
      options = await this.#validateAndSanitizeConfiguration(
        merge({}, DefaultOptions, config, {
          loggerOptions: {
            enabled: config.debug,
            module: `RMQBQ:${config.queue}`,
          },
        })
      )
    } catch (error) {
      throw error
    }
    this.#logger = pino(options.loggerOptions)
    this.#queue = options.queue
    this.#maxBatch = options.maxBatch
    this.#chunkSize = options.chunkSize
    this.#discardOnDeserializeError = options.discardOnDeserializeError
    this.#discardOnValidationError = options.discardOnValidationError
    this.#discardOnInvalid = options.discardOnInvalid
    this.#onSpill = options.onSpill
    this.#onItem = options.onItem
    if (options.rmqChannel instanceof Channel) {
      this.#logger.info(`Using provided channel`)
      this.#channel = options.rmqChannel as RMQBQ.RabbitMQQueue | RMQBQ.RabbitMQConfirmQueue
    } else {
      this.#logger.info(`Creating channel`)
      this.#channel = await this.#getRabbitMQQueue({
        queue: options.queue,
        rmqQueueType: options.rmqQueueType as 'channel' | 'confirmChannel',
        rmqConnectionOptions: options.rmqConnectionOptions as RMQBQ.RabbitMQConnectionOptions,
        rmqQueueOptions: options.rmqQueueOptions as RMQBQ.RabbitMQQueueOptions,
      })
    }
    if (options.coordinator instanceof CoordinatorDriverBase) {
      this.#coordinator = options.coordinator
    } else {
      switch (options.coordinator) {
        case 'database':
          this.#coordinator = new DatabaseCoordinator(
            options.queue,
            options.maxBatch,
            options.interval,
            options.databaseOptions as RMQBQ.DatabaseOptions
          )
          break

        case 'memory':
          this.#coordinator = new MemoryCoordinator(
            options.queue,
            options.maxBatch,
            options.interval
          )
          break

        case 'mqtt':
          this.#coordinator = new MQTTCoordinator(
            options.queue,
            options.maxBatch,
            options.interval,
            options.mqttOptions as RMQBQ.MQTTOptions
          )
          break

        case 'redis':
          this.#coordinator = new RedisCoordinator(
            options.queue,
            options.maxBatch,
            options.interval,
            options.redisOptions as RMQBQ.RedisOptions
          )
          break
      }
    }
    this.#logger.info(`Booted and ready to consume`)
  }

  async #tick() {
    const balance = await this.#coordinator.balance
    this.#storeAndEmit('tick', this.#getTimestamp(), balance)
    if (!this.#corked && balance > 0) {
      this.#logger.info(`Starting to Spill ${balance} items`)
      this.#storeAndEmit('spill', this.#getTimestamp(), balance)
      const promises: Promise<RMQBQ.RabbitMQMessage | undefined>[] = new Array(balance)
        .fill(null)
        .map(() => this.#getSingleMessage())
      const getResults = await Promise.all(promises)
      const messages = getResults.filter((msg) => msg !== undefined) as RMQBQ.RabbitMQMessage[]
      const deserializedItems = (await Promise.all(
        messages.map(async (msg: RMQBQ.RabbitMQMessage) => {
          if ('function' === typeof this.#deserializeItem) {
            try {
              return {
                message: msg,
                item: await this.#deserializeItem(msg.content),
              }
            } catch (error) {
              this.#storeAndEmit('error', error, msg)
              const requeue =
                !this.#discardOnDeserializeError ||
                (error instanceof ReEnquableError && error.reenqueue === true)
              this.#doNack(msg, requeue)
              this.#logger.error(
                `Encounted an error deserializing item: ${error.message}. Requeue: ${requeue}`
              )
              return undefined
            }
          } else {
            return {
              message: msg,
              item: msg.content,
            }
          }
        })
      )) as (RMQBQ.DeserializedMessage<T> | undefined)[]
      const validatedItems = (await Promise.all(
        deserializedItems.map(async (item: RMQBQ.DeserializedMessage<T> | undefined) => {
          if (item === undefined) {
            // nothing to do here since we already nacked in the previous step
            return undefined
          }
          if ('function' === typeof this.#validateItem) {
            try {
              const valid = await this.#validateItem(item.item)
              if (!valid) {
                this.#storeAndEmit('invalid', item.item, item.message)
                this.#doNack(item.message, !this.#discardOnInvalid)
                return undefined
              }
            } catch (error) {
              this.#storeAndEmit('error', error, item.message)
              const requeue =
                !this.#discardOnValidationError ||
                (error instanceof ReEnquableError && error.reenqueue === true)
              this.#doNack(item.message, requeue)
              this.#logger.error(
                `Encounted an error validating item "${inspect(item.item, false, 3, false)}": ${
                  error.message
                }. Requeue: ${requeue}`
              )
              return undefined
            }
          }
          return {
            message: item.message,
            item: item.item,
          }
        })
      )) as (RMQBQ.DeserializedMessage<T> | undefined)[]
      const items = validatedItems.filter(
        (item) => item !== undefined
      ) as RMQBQ.DeserializedMessage[]
      if ('function' === typeof this.#onSpill) {
        const chunks = this.#chunk(items, this.#chunkSize)
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const chunkItems = chunk.map((deserializedMessage) => deserializedMessage.item)
          try {
            await this.#doSpill(chunk)
            await this.#doAckAll(chunk.map((deserializedMessage) => deserializedMessage.message))
            this.#logger.info(`Spill Succeeded for ${chunk.length} items`)
          } catch (error) {
            this.#storeAndEmit('error', error, chunkItems)
            const requeue = error instanceof ReEnquableError && error.reenqueue === true
            await this.#doNackAll(
              chunk.map((deserializedMessage) => deserializedMessage.message),
              requeue
            )
            this.#logger.warn(
              `Spill Failed for ${chunk.length} items: ${error.message}. Requeue: ${requeue}`
            )
          }
        }
      } else if ('function' === typeof this.#onItem) {
        const chunks = this.#chunk(items, this.#chunkSize)
        for (let i = 0; i < chunks.length; i++) {
          const chunk: RMQBQ.DeserializedMessage<T>[] = chunks[i]
          await Promise.all(
            chunk.map(async (deserializedMessage: RMQBQ.DeserializedMessage) => {
              try {
                await this.#doItem(deserializedMessage.item)
                await this.#doAck(deserializedMessage.message)
                this.#logger.info(`Spill Succeeded for item ${inspect(deserializedMessage.item)}`)
              } catch (error) {
                this.#storeAndEmit('error', error, deserializedMessage.item)
                const requeue = error instanceof ReEnquableError && error.reenqueue === true
                await this.#doNack(deserializedMessage.message, requeue)
                this.#logger.warn(
                  `Spill Failed for item ${inspect(deserializedMessage.item, false, 3, false)}: ${
                    error.message
                  }. Requeue: ${requeue}`
                )
              }
            })
          )
        }
      }
    }
    const endListSize = await this.#coordinator.balance
    if (balance !== endListSize) {
      if (endListSize < this.#maxBatch) {
        this.#storeAndEmit('drain')
        this.#logger.info(`Queue Drained and is able to accept new items`)
      }
      if (endListSize === 0) {
        this.#storeAndEmit('finish')
        this.#logger.info(`Queue Emptied and is able to accept new items`)
      }
    }
    if (!this.#corked) {
      this.#immediate = setImmediate(() => {
        this.#tick()
      })
    }
  }

  async #getSingleMessage(): Promise<RMQBQ.RabbitMQMessage | undefined> {
    const msg = await this.#channel.get(this.#queue)
    if (!msg) {
      return undefined
    }
    return msg
  }

  async #doAck(msg: RMQBQ.RabbitMQMessage): Promise<void> {
    this.#channel.ack(msg)
  }

  async #doNack(msg: RMQBQ.RabbitMQMessage, requeue: boolean = false): Promise<void> {
    this.#channel.nack(msg, false, requeue)
  }

  async #doAckAll(messages: RMQBQ.RabbitMQMessage[]): Promise<void> {
    await Promise.all(messages.map((msg) => this.#doAck(msg)))
  }

  async #doNackAll(messages: RMQBQ.RabbitMQMessage[], requeue: boolean = false): Promise<void> {
    await Promise.all(messages.map((msg) => this.#doNack(msg, requeue)))
  }

  async #doSpill(items: T[]): Promise<void> {
    if ('function' === typeof this.#onSpill) {
      await this.#onSpill(items)
    }
  }

  async #doItem(items: T): Promise<void> {
    if ('function' === typeof this.#onItem) {
      await this.#onItem(items)
    }
  }

  #getTimestamp() {
    return Date.now()
  }

  #chunk(array: any[], size: number = 1000000) {
    size = Math.max(Math.round(size), 0)
    const length = array.length
    if (!length || size < 1) {
      return []
    }
    let index = 0
    let resIndex = 0
    const result = new Array(Math.ceil(length / size))

    while (index < length) {
      result[resIndex++] = array.slice(index, (index += size))
    }
    return result
  }

  #storeAndEmit(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }

  async #validateAndSanitizeConfiguration(
    config: RMQBQ.ConfigMergedWithDefaults<T>
  ): Promise<RMQBQ.Config<T>> {
    if ('object' !== typeof config || null === config) {
      throw new ValidationError('Missing configuration object', [
        'A configuration object is required',
      ])
    }
    const validationConstraints = {
      queue: {
        presence: {
          message: 'is required',
        },
        type: 'string',
      },
      rmqChannel: {
        presence: false,
        type: 'queue',
      },
      rmqQueueType: function (_value, attributes) {
        if (attributes.rmqChannel) {
          return {}
        }
        return {
          presence: { message: 'is required when rmqChannel is not provided' },
          inclusion: ['queue', 'confirmQueue'],
          type: 'string',
        }
      },
      rmqConnectionOptions: function (_value, attributes) {
        if (attributes.rmqChannel) {
          return {}
        }
        return {
          presence: { message: 'is required when rmqChannel is not provided' },
          type: 'rmqConnectionOptions',
        }
      },
      rmqQueueOptionsType: function (_value, attributes) {
        if (attributes.rmqChannel) {
          return {}
        }
        return {
          presence: { message: 'is required when rmqChannel is not provided' },
          type: 'rmqQueueOptionsType',
        }
      },
      coordinator: {
        presence: {
          message: 'is required',
        },
        type: 'rmqCoordinatorType',
      },
      redisOptions: function (_value, attributes) {
        if (attributes.coordinator === 'redis') {
          return {
            presence: { message: 'is required when coordinator is redis' },
            type: 'redisOptions',
          }
        }
        return {}
      },
      mqttOptions: function (_value, attributes) {
        if (attributes.coordinator === 'mqtt') {
          return {
            presence: { message: 'is required when coordinator is mqtt' },
            type: 'mqttOptions',
          }
        }
        return {}
      },
      databaseOptions: function (_value, attributes) {
        if (attributes.coordinator === 'database') {
          return {
            presence: { message: 'is required when coordinator is database' },
            type: 'databaseOptions',
          }
        }
        return {}
      },
      debug: {
        presence: {
          message: 'is required',
        },
        type: 'boolean',
      },
      loggerOptions: {
        presence: {
          message: 'is required',
        },
        type: 'loggerOptions',
      },
      interval: {
        presence: {
          message: 'is required',
        },
        type: 'integer',
        numericality: {
          noStrings: true,
          strict: true,
          onlyInteger: true,
          greaterThan: 100,
        },
      },
      maxBatch: {
        presence: {
          message: 'is required',
        },
        type: 'integer',
        numericality: {
          noStrings: true,
          strict: true,
          onlyInteger: true,
          greaterThan: 0,
          lessThanOrEqualTo: 100000,
        },
      },
      autostart: {
        presence: {
          message: 'is required',
        },
        type: 'boolean',
      },
      chunkSize: {
        presence: {
          message: 'is required',
        },
        type: 'integer',
        numericality: {
          noStrings: true,
          strict: true,
          onlyInteger: true,
          greaterThanOrEqualTo: 1,
          lessThanOrEqualTo: 1000000,
        },
      },
      discardOnDeserializeError: {
        presence: {
          message: 'is required',
        },
        type: 'boolean',
      },
      discardOnValidationError: {
        presence: {
          message: 'is required',
        },
        type: 'boolean',
      },
      discardOnInvalid: {
        presence: {
          message: 'is required',
        },
        type: 'boolean',
      },
      onSpill: function (_value, attributes) {
        if ('function' === typeof attributes.onItem) {
          return {
            type: 'undefined',
          }
        }
        return {
          presence: {
            message: 'or "onItem" is required',
          },
          type: 'callable',
        }
      },
      onItem: function (_value, attributes) {
        if ('function' === typeof attributes.onSpill) {
          return {
            type: 'undefined',
          }
        }
        return {
          presence: {
            message: 'or "onSpill" is required',
          },
          type: 'callable',
        }
      },
    }
    try {
      const validatorErrors = validator(config, validationConstraints)
      if (Array.isArray(validatorErrors) && validatorErrors.length > 0) {
        throw new ValidationError('Invalid Configuration', validatorErrors)
      }
    } catch (errors) {
      if (errors instanceof Error) {
        throw errors
      }
      if ('function' === typeof config.onSpill && 'function' === typeof config.onItem) {
        errors.push('onSpill and onItem cannot be defined at the same time')
      }
      throw new ValidationError('Invalid Configuration', errors)
    }
    if ('function' === typeof config.onSpill && 'function' === typeof config.onItem) {
      throw new ValidationError('Invalid Configuration', [
        'onSpill and onItem cannot be defined at the same time',
      ])
    }
    return config as RMQBQ.Config<T>
  }

  async #getRabbitMQQueue({
    queue,
    rmqQueueType,
    rmqConnectionOptions,
    rmqQueueOptions,
  }: RMQBQ.GetRabbitMQQueueOptions): Promise<RMQBQ.RabbitMQQueue | RMQBQ.RabbitMQConfirmQueue> {
    const connection = await amqplib.connect(rmqConnectionOptions)
    let channel: Channel
    if (rmqQueueType === 'confirmChannel') {
      channel = await connection.createConfirmChannel()
    } else {
      channel = await connection.createChannel()
    }
    await channel.assertQueue(queue, rmqQueueOptions)
    return channel
  }

  /**
   * Creates, validates the configuration and initializes an instance of `RabbitMQToBucketQueue`.
   * @param config The configuration for the bucket queue. There are some basic options set by default which can be skipped.
   * @returns The instance of `RabbitMQToBucketQueue` which can be used to interact with the queue.
   * @throws ValidationError if the configuration is invalid.
   * @remark Because some of the initialization requires asyncronous operations, the constructor is private and this method should be used to create an instance of `RabbitMQToBucketQueue`.
   */
  public static async initialize<T = Buffer>(
    config: Partial<RMQBQ.Config<T>>
  ): Promise<RabbitMQToBucketQueue<T>> {
    const instance = new this<T>()
    try {
      await instance.#doBoot(config)
    } catch (error) {
      throw error
    }
    return instance
  }
}
