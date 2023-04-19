import { CoordinatorDriverBase } from '../../abstracts'
import { Redis } from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import merge from 'lodash.merge'
import type * as RMQBQ from 'contracts/RMQBQ'

/**
 * The `RedisCoordinator` class provides a coordinator which uses Redis to ensure cross-process consistency of counts.
 */
export class RedisCoordinator extends CoordinatorDriverBase<RMQBQ.RedisOptions> {
  #client: Redis
  /**
   * {@inheritDoc CoordinatorDriverBase.constructor}
   * @param options Options for connecting to the Redis instance
   */
  constructor(queue: string, maxBatch: number, interval: number, options: RMQBQ.RedisOptions) {
    super(queue, maxBatch, interval, options)
    const remainder = this.$interval % 1000
    if (remainder !== 0) {
      throw new Error(
        `Redis requires intervals in round seconds represented as milliseconds. ${this.$interval} is not divisible by 1000.`
      )
    }
    this.#client = new Redis(
      merge({}, options, { autoResubscribe: false, lazyConnect: true, maxRetriesPerRequest: 0 })
    )
    /**
     * @remarks Here we are intentionally ignoring errors which are caused outside of a specific request.
     * Any requests made to the client have specific error handlers hooked to them.
     */
    this.#client.on('error', () => {})
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.balance}
   */
  public get balance(): Promise<number> {
    return this.#getBalance()
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.increment}
   */
  public async increment(count: number): Promise<void> {
    // this.#client.once('error', (error) => {
    //   throw error
    // })
    const key = [this.$queue, uuidv4()].join(':')
    await this.#client.setex(key, this.$interval / 1000, count)
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.reset}
   */
  public async reset(): Promise<void> {
    // this.#client.once('error', (error) => {
    //   throw error
    // })
    const pattern = `${this.$queue}:[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-4[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[89ABab][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]`
    const keys = await this.#client.keys(pattern)
    if (keys.length === 0) {
      return
    }
    await this.#client.del(keys)
  }

  async #getBalance(): Promise<number> {
    // this.#client.once('error', (error) => {
    //   throw error
    // })
    const pattern = `${this.$queue}:[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-4[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[89ABab][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]`
    const keys = await this.#client.keys(pattern)
    if (keys.length === 0) {
      return this.$maxBatch
    }
    const values = await this.#client.mget(keys)
    let sum = 0
    for (let i = 0; i < values.length; i++) {
      sum += parseInt(values[i] as string)
    }
    const balance = this.$maxBatch - sum
    return balance < 0 ? 0 : balance
  }
}
