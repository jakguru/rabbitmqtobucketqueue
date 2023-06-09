import { CoordinatorDriverBase } from '../../abstracts'

/**
 * The `MemoryCoordinator` class provides a simple in-memory coordinator which cannot be shared between instances.
 *
 * @remarks The `MemoryCoordinator` class is useful for development and testing purposes, but should be replaced with a different coordinator in production.
 */
export class MemoryCoordinator extends CoordinatorDriverBase {
  #total: number = 0

  /**
   * @private
   */
  constructor(queue: string, maxBatch: number, interval: number) {
    super(queue, maxBatch, interval, undefined)
    setInterval(this.#reset.bind(this), interval)
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.balance}
   */
  public get balance(): number {
    return this.#total >= this.$maxBatch ? 0 : this.$maxBatch - this.#total
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.ready}
   */
  public async ready(): Promise<void> {
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.increment}
   */
  public increment(count: number): void {
    this.#total += count
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.reset}
   */
  public reset(): void {
    this.#reset()
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.test}
   */
  public test(): void {
    return
  }

  #reset(): void {
    this.#total = 0
    return
  }
}
