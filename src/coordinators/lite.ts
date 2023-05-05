import { CoordinatorDriverBase } from '../../abstracts'
import { CoordinationClient } from '../CoordinationClient'
import { CoordinatorTestFailedError } from '../CoordinatorTestFailedError'
import type * as RMQBQ from 'contracts/RMQBQ'

export class LiteCoordinator extends CoordinatorDriverBase<RMQBQ.LiteOptions> {
  #balance: number = 0
  readonly #client: CoordinationClient
  readonly #ready: Promise<void>
  /**
   * @private
   */
  constructor(queue: string, maxBatch: number, interval: number, options: RMQBQ.LiteOptions) {
    super(queue, maxBatch, interval, options)
    let resolveReady: () => void
    let rejectReady: (reason: any) => void
    this.#ready = new Promise((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })
    this.#client = new CoordinationClient(
      queue,
      maxBatch,
      interval,
      options,
      (balance) => {
        this.#balance = balance
      },
      () => {
        resolveReady()
      },
      (reason) => {
        rejectReady(new Error(reason))
      }
    )
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.balance}
   */
  public get balance(): number {
    return this.#balance
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.ready}
   */
  public async ready(): Promise<void> {
    return await this.#ready
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.increment}
   */
  public async increment(count: number): Promise<void> {
    await this.#client.increment(count)
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.reset}
   */
  public async reset(): Promise<void> {
    await this.#client.reset()
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.test}
   */
  public async test(): Promise<void> {
    const res = await this.#client.test()
    if (!res) {
      throw new CoordinatorTestFailedError(
        'Did not get response from coordinator withing 10 seconds'
      )
    }
  }
}
