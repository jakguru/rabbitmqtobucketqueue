import { CoordinatorDriverBase } from 'abstracts'
import type * as RMQBQ from 'contracts/RMQBQ'

export class DatabaseCoordinator extends CoordinatorDriverBase<RMQBQ.DatabaseOptions> {
  /**
   * {@inheritDoc CoordinatorDriverBase.constructor}
   * @param options Options for connecting to the database
   */
  constructor(queue: string, maxBatch: number, interval: number, options: RMQBQ.DatabaseOptions) {
    super(queue, maxBatch, interval, options)
  }

  public get balance(): number {
    return 0
  }

  public async increment(_count: number): Promise<void> {
    return
  }
}
