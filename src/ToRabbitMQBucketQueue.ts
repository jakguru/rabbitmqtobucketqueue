/// <reference path="./rabbitmq/index.ts" />
import { EventEmitter } from 'events'
import merge from 'lodash.merge'
import amqplib from 'amqplib'
import validator from './validation'
import { Channel, ConfirmChannel } from 'amqplib/lib/channel_model'
import pino from 'pino'
import { ValidationError } from './validation/ValidationError'
import { v4 as uuidv4 } from 'uuid'

import type { Logger } from 'pino'
import type * as RMQBQ from '../contracts/RMQBQ'
import type * as TRMQBQ from '../contracts/TRMQBQ'

const DefaultOptions: TRMQBQ.DefaultOptions = {
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
}

export class ToRabbitMQBucketQueue<T = any> extends EventEmitter {
  #queue: string
  #logger: Logger
  #booted: boolean = false
  #connection: RMQBQ.RabbitMQConnection | undefined = undefined
  #channel: RMQBQ.RabbitMQQueue | RMQBQ.RabbitMQConfirmQueue
  #serializeItem: TRMQBQ.SerilizeMessageCallback<T> | undefined = undefined

  /**
   * @typeParam T The type of the items which are being mitted. Defaults to any.
   */
  private constructor() {
    super({
      captureRejections: true,
    })
  }

  /**
   * A boolean indicating whether the To Bucket Queue instance is booted.
   */
  public get booted(): boolean {
    return this.#booted
  }

  public async enqueue(
    item: T | Array<T>,
    keepOrder: boolean = false,
    rejectOnError: boolean = false
  ) {
    if (!this.#booted) {
      throw new Error('ToRabbitMQBucketQueue is not booted.')
    }
    const wasArray = Array.isArray(item)
    const items = Array.isArray(item) ? item : [item]
    if (keepOrder) {
      const results: Array<string | Error> = []
      for (const item of items) {
        results.push(await this.#enqueueAndAwait(item, rejectOnError))
      }
      return wasArray ? results : results[0]
    } else {
      const results = await Promise.all(
        items.map((item) => this.#enqueueAndAwait(item, rejectOnError))
      )
      return wasArray ? results : results[0]
    }
  }

  async #enqueueAndAwait(
    item: T,
    rejectOnError: boolean = false,
    correlationId?: string
  ): Promise<string | Error> {
    const defaultSerializer = async (item: T) => {
      return Buffer.from(JSON.stringify(item), 'utf-8')
    }
    const serializer = this.#serializeItem || defaultSerializer
    const serializedItem = await serializer(item)
    const canHaveAck = this.#channel instanceof ConfirmChannel
    if (!correlationId) {
      correlationId = uuidv4()
    }
    return await new Promise((resolve, reject) => {
      if (canHaveAck) {
        this.#channel.sendToQueue(
          this.#queue,
          serializedItem,
          {
            correlationId,
          },
          (err) => {
            if (err && rejectOnError) {
              return reject(err)
            } else if (err) {
              return resolve(err)
            } else {
              return resolve(correlationId as string)
            }
          }
        )
      } else {
        this.#channel.sendToQueue(this.#queue, serializedItem, {
          correlationId,
        })
        return resolve(correlationId as string)
      }
    })
  }

  public async shutdown() {
    if (!this.#booted) {
      throw new Error('ToRabbitMQBucketQueue is not booted.')
    }
    try {
      this.#channel.close()
    } catch (error) {
      if (error.message !== 'Channel closed') {
        throw error
      }
    }
    if (this.#connection) {
      this.#connection.close()
    }
  }

  async #doBoot(config: Partial<TRMQBQ.Config<T>>) {
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
    let options: TRMQBQ.Config<T>
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
    this.#channel.on('error', (error) => {
      this.#handleFatalError(error)
    })
    this.#logger.info(`Booted and ready to emit`)
  }

  async #validateAndSanitizeConfiguration(
    config: TRMQBQ.ConfigMergedWithDefaults<T>
  ): Promise<TRMQBQ.Config<T>> {
    if ('object' !== typeof config || null === config) {
      throw new ValidationError('Missing configuration object', [
        'A configuration object is required',
      ])
    }
    const validationConstraints = {
      queue: {
        exists: {
          message: 'is required',
        },
        presence: {
          message: 'is required',
        },
        type: 'string',
      },
      rmqChannel: {
        type: 'queue',
        queue: true,
      },
      rmqQueueType: function (_value, attributes) {
        if (attributes.rmqChannel) {
          return {}
        }
        return {
          exists: { message: 'is required when rmqChannel is not provided' },
          inclusion: {
            within: ['queue', 'confirmQueue'],
            message: 'must be either "queue" or "confirmQueue"',
          },
          presence: {
            message: 'is required',
          },
          type: 'string',
        }
      },
      rmqConnectionOptions: function (_value, attributes) {
        if (attributes.rmqChannel) {
          return {}
        }
        return {
          exists: { message: 'is required when rmqChannel is not provided' },
          type: 'rmqConnectionOptions',
          rmqConnectionOptions: true,
        }
      },
      rmqQueueOptions: function (_value, attributes) {
        if (attributes.rmqChannel) {
          return {}
        }
        return {
          exists: { message: 'is required when rmqChannel is not provided' },
          type: 'rmqQueueOptionsType',
          rmqQueueOptionsType: true,
        }
      },
      debug: {
        exists: {
          message: 'is required',
        },
        type: 'boolean',
      },
      loggerOptions: {
        exists: {
          message: 'is required',
        },
        type: 'loggerOptions',
        loggerOptions: true,
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
      throw new ValidationError('Invalid Configuration', errors)
    }
    return config as RMQBQ.Config<T>
  }

  async #getRabbitMQQueue({
    queue,
    rmqQueueType,
    rmqConnectionOptions,
    rmqQueueOptions,
  }: RMQBQ.GetRabbitMQQueueOptions): Promise<RMQBQ.RabbitMQQueue | RMQBQ.RabbitMQConfirmQueue> {
    this.#connection = await amqplib.connect(rmqConnectionOptions)
    this.#connection.on('error', (error) => {
      this.#handleFatalError(error)
    })
    let channel: Channel
    if (rmqQueueType === 'confirmChannel') {
      channel = await this.#connection.createConfirmChannel()
    } else {
      channel = await this.#connection.createChannel()
    }
    await channel.assertQueue(queue, rmqQueueOptions)
    return channel
  }

  async #handleFatalError(error: Error): Promise<void> {
    this.#storeAndEmit('fatal', error)
    if (this.#channel) {
      try {
        this.#channel.close()
      } catch (e) {
        // nothing to do at this point. We're already shutting it down
        this.#logger.error(`Failed to close channel`)
        this.#storeAndEmit('error', e)
      }
    }
    if (this.#connection) {
      this.#connection.close()
    }
    this.#storeAndEmit('died', error)
  }

  #storeAndEmit(event: string, ...args: any[]) {
    this.emit(event, ...args)
  }

  /**
   * Creates, validates the configuration and initializes an instance of `ToRabbitMQToBucketQueue`.
   * @param config The configuration for the bucket queue. There are some basic options set by default which can be skipped.
   * @returns The instance of `ToRabbitMQToBucketQueue` which can be used to interact with the queue.
   * @throws ValidationError if the configuration is invalid.
   * @remark Because some of the initialization requires asyncronous operations, the constructor is private and this method should be used to create an instance of `ToRabbitMQToBucketQueue`.
   */
  public static async initialize<T = any>(
    config: Partial<TRMQBQ.Config<T>>
  ): Promise<ToRabbitMQBucketQueue<T>> {
    const instance = new this<T>()
    try {
      await instance.#doBoot(config)
    } catch (error) {
      throw error
    }
    return instance
  }
}
