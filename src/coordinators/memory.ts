import { CoordinatorDriverBase } from 'abstracts'

/**
 * The `MemoryCoordinator` class provides a simple in-memory coordinator which cannot be shared between instances.
 *
 * @remarks The `MemoryCoordinator` class is useful for development and testing purposes, but should be replaced with a different coordinator in production.
 */
export class MemoryCoordinator extends CoordinatorDriverBase {
  #total: number = 0

  /**
   * {@inheritDoc CoordinatorDriverBase.constructor}
   * @param options Undefined. No Options are required for the MemoryCoordinator
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
   * {@inheritDoc CoordinatorDriverBase.increment}
   */
  public increment(count: number): void {
    this.#total += count
    return
  }

  #reset(): void {
    this.#total = 0
    return
  }
}
