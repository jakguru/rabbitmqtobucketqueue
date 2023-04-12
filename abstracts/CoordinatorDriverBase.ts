import { CoordinatorDriver } from '../contracts/CoordinatorDriver'

/**
 * The `CoordinatorDriverBase` class is an abstract class which is extended by all Coordinator Drivers.
 * It cannot be instantiated directly because it is an abstract class.
 * @typeParam CoordinatorDriverOptionsType The type of the options object which is passed to the constructor of the Coordinator Driver.
 * It defines the shape of the options which are passed to the underlying provider. By default, it is `undefined`.
 */
export abstract class CoordinatorDriverBase<CoordinatorDriverOptionsType = undefined>
  implements CoordinatorDriver
{
  protected readonly $queue: string
  protected readonly $maxBatch: number
  protected readonly $interval: number
  protected readonly $options: CoordinatorDriverOptionsType

  /**
   * Create a new instance of a Coordinator Driver.
   * @param queue The name of the queue which the RabbitMQToBucketQueue instance is consuming from.
   * @param maxBatch The maximum number of items which can be sent in a single batch.
   * @param interval The minimum interval in milliseconds at which the RabbitMQToBucketQueue instance will send batches.
   * @param options Options for the underlying coordination driver.
   */
  constructor(
    queue: string,
    maxBatch: number,
    interval: number,
    options: CoordinatorDriverOptionsType
  ) {
    this.$queue = queue
    this.$maxBatch = maxBatch
    this.$interval = interval
    this.$options = options
  }

  /**
   * The remaining quota of items which can be consumed without exceeding the maximum batch size.
   */
  public abstract balance: number | Promise<number>

  /**
   * Inform the coordinator that a certain number of items has been sent
   * @param count The number of to increment the counter by.
   */
  public abstract increment(count: number): void | Promise<void>
}
