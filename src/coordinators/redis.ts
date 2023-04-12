import { CoordinatorDriverBase } from 'abstracts'
import { Redis } from 'ioredis'
import type * as RMQBQ from 'contracts/RMQBQ'
import { v4 as uuidv4 } from 'uuid'

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
    this.#client = new Redis(options)
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
    const key = [this.$queue, uuidv4()].join(':')
    await this.#client.setex(key, this.$interval / 1000, count)
    return
  }

  async #getBalance(): Promise<number> {
    const pattern = `${this.$queue}:[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-4[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[89ABab][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]-[A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]`
    const keys = await this.#client.keys(pattern)
    if (keys.length === 0) {
      return this.$maxBatch
    }
    const values = await this.#client.mget(keys)
    const sum = values.reduce((acc, val) => acc + Number(val), 0)
    return this.$maxBatch - sum
  }
}
