import { EventEmitter } from 'events'
import merge from 'lodash.merge'
import amqplib from 'amqplib'
import { schema, rules } from 'Validator'
import { Channel } from 'amqplib/lib/channel_model'
import { CoordinatorDriverBase } from '../abstracts'
import {
  DatabaseCoordinator,
  MemoryCoordinator,
  MQTTCoordinator,
  RedisCoordinator,
} from '../src/coordinators'
import pino from 'pino'

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
  minBatch: 0,
  maxBatch: 50,
  autostart: true,
  chunkSize: 1000000,
}

/**
 * RabbitMQToBucketQueue is a RabbitMQ Consumer which limits the rate of consumption by consuming small batches of messages periodically and releasing them.
 * @typeParam T The type of the items in the bucket. Defaults to Buffer. You should change this to the type of the item you create using the {@link Config.deserializeItem} method.
 */
export class RabbitMQToBucketQueue<T = Buffer> extends EventEmitter {
  readonly #storedEvents: Map<string, Set<any>> = new Map()
  readonly #bucket: T[] = []
  readonly #boot: Promise<void>
  #interval: number
  #minBatch: number
  #maxBatch: number
  #chunkSize: number
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
  #lastStart: number = 0
  #lastEnd: number = 0
  #touched: boolean = false

  /**
   * @typeParam T The type of the items in the bucket. Defaults to Buffer. You should change this to the type of the item you create using the {@link Config.deserializeItem} method.
   */
  constructor(config: Partial<RMQBQ.Config<T>>) {
    super({
      captureRejections: true,
    })
    this.#boot = this.#validateAndSanitizeConfiguration(
      merge({}, DefaultOptions, config, {
        loggerOptions: {
          enabled: config.debug,
        },
      })
    ).then(async (options: RMQBQ.Config<T>) => {
      this.#interval = options.interval
      this.#minBatch = options.minBatch
      this.#maxBatch = options.maxBatch
      this.#chunkSize = options.chunkSize
      this.#onSpill = options.onSpill
      this.#onItem = options.onItem
      if (options.rmqChannel instanceof Channel) {
        this.#channel = options.rmqChannel as RMQBQ.RabbitMQQueue | RMQBQ.RabbitMQConfirmQueue
      } else {
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
      this.#logger = pino(options.loggerOptions)
    })
  }

  /**
   * A promise that resolves when the Bucket Queue instance is booted.
   */
  public get boot(): Promise<void> {
    return this.#boot
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
  public get pressure() {
    return this.#bucket.length
  }

  /**
   * Pause the BucketQueue by corking it, preventing any more events from processing.
   * @returns void
   */
  public cork() {
    clearImmediate(this.#immediate)
    this.#corked = true
    this.#storeAndEmit('corked')
  }

  /**
   * Resume the BucketQueue by uncorking it, allowing events to continue processing.
   * @returns void
   */
  public uncork() {
    this.#corked = false
    process.nextTick(() => this.#tick.bind(this))
    this.#storeAndEmit('uncorked')
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

  async #tick() {
    const startListSize = this.#bucket.length
    this.#storeAndEmit('tick', this.#getTimestamp(), startListSize)
    if (!this.#corked && this.#enoughTimeHasElappsed && this.#bucket.length >= this.#minBatch) {
    }
    const endListSize = this.#bucket.length
    if (startListSize !== endListSize) {
      if (endListSize < this.#maxBatch) {
        this.#storeAndEmit('drain')
      }
      if (endListSize === 0) {
        this.#storeAndEmit('finish')
      }
    }
    if (!this.#corked) {
      this.#immediate = setImmediate(() => {
        this.#tick()
      })
    }
  }

  get #enoughTimeHasElappsed() {
    const now = this.#getTimestamp()
    const elapsed = now - this.#lastEnd
    return elapsed >= this.#interval
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
    if (this.#touched) {
      this.emit(event, ...args)
    } else if (!['tick'].includes(event)) {
      if (!this.#storedEvents.has(event)) {
        this.#storedEvents.set(event, new Set())
      }
      this.#storedEvents.get(event)?.add(args)
    }
  }

  async #validateAndSanitizeConfiguration(
    config: RMQBQ.ConfigMergedWithDefaults<T>
  ): Promise<RMQBQ.Config<T>> {
    const validationSchema = schema.create({
      queue: schema.string(),
      rmqChannel: schema.queue.optional(),
      rmqQueueType: schema.enum.optional(['queue', 'confirmQueue'] as const, [
        rules.requiredIfNotExists('rmqChannel'),
      ]),
      rmqConnectionOptions: schema.object.optional().members(
        {
          protocol: schema.string(),
          hostname: schema.string(),
          port: schema.number(),
          username: schema.string.optional(),
          password: schema.string.optional(),
          locale: schema.string.optional(),
          frameMax: schema.number.optional(),
          heartbeat: schema.number.optional(),
          vhost: schema.string(),
        },
        [rules.requiredIfNotExists('rmqChannel')]
      ),
      rmqQueueOptions: schema.object.optional().members(
        {
          exclusive: schema.boolean.optional(),
          durable: schema.boolean.optional(),
          autoDelete: schema.boolean.optional(),
          arguments: schema.any.optional(),
          messageTtl: schema.number.optional(),
          expires: schema.number.optional(),
          deadLetterExchange: schema.string.optional(),
          deadLetterRoutingKey: schema.string.optional(),
          maxLength: schema.number.optional(),
          maxPriority: schema.number.optional(),
        },
        [rules.requiredIfNotExists('rmqChannel')]
      ),
      coordinator: schema.coordinatorDriver(),
      redisOptions: schema.object.optional().members(
        {
          host: schema.string.optional([rules.requiredWhenNotExists('path')]),
          port: schema.number.optional([rules.requiredWhenExists('host')]),
          db: schema.number.optional([rules.requiredWhenExists('host')]),
          path: schema.string.optional([rules.requiredWhenNotExists('host')]),
        },
        [rules.requiredWhenStringAndValue('coordinator', 'redis')]
      ),
      mqttOptions: schema.object.optional().members(
        {
          host: schema.string(),
          port: schema.number(),
          protocol: schema.enum(['mqtt', 'wss', 'ws', 'mqtts', 'tcp', 'ssl', 'wx', 'wxs']),
        },
        [rules.requiredWhenStringAndValue('coordinator', 'mqtt')]
      ),
      databaseOptions: schema.object.optional().members(
        {
          table: schema.string(),
          client: schema.enum(['pg', 'sqlite3', 'mysql', 'mysql2', 'mssql', 'oracledb']),
          connection: schema.object().anyMembers(),
        },
        [rules.requiredWhenStringAndValue('coordinator', 'database')]
      ),
      debug: schema.boolean(),
      loggerOptions: schema.object.anyMembers(),
      interval: schema.number([rules.min(100)]),
      minBatch: schema.number([rules.min(0), rules.lessThan('maxBatch')]),
      maxBatch: schema.number([rules.max(100000), rules.greaterThan('minBatch')]),
      autostart: schema.boolean(),
      chunkSize: schema.number([rules.range(0, 1000000)]),
      onSpill: schema.callable.optional([rules.requiredIfNotExists('onItem')]),
      onItem: schema.callable.optional([rules.requiredIfNotExists('onSpill')]),
    })
    await validationSchema.validate(config)
    if ('function' === typeof config.onSpill && 'function' === typeof config.onItem) {
      throw new Error('onSpill and onItem cannot be defined at the same time')
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
}
