import { CoordinatorDriver } from '../contracts/CoordinatorDriver'
import type * as RMQBQ from 'contracts/RMQBQ'

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
   * A function which is called to initialise the coordination driver.
   */
  public abstract ready(): Promise<void> | never

  /**
   * Inform the coordinator that a certain number of items has been sent
   * @param count The number of to increment the counter by.
   */
  public abstract increment(count: number): void | Promise<void>

  /**
   * Reset the balance to the maximum batch size.
   */
  public abstract reset(): void | Promise<void>

  /**
   * Remove all expired items from the coordination store.
   * This method is called automatically by the RabbitMQToBucketQueue instance.
   * It is not abstracted because it is not required for all coordination drivers.
   */
  public declutter(): void | Promise<void> {}

  /**
   * A function which is called to cleanly shutdown the coordination driver.
   */
  public shutdown(): void | Promise<void> {}

  /**
   * A function which is called to test the coordination driver. This can be used to check connectivity, or perform any other relevant validations asyncronously.
   * @throws {@link CoordinatorTestFailedError} if the test fails.
   */
  public abstract test(): void | Promise<void> | never

  /**
   * Create a new instance of the class await for it to be ready.
   * @typeParam CoordinatorDriverOptionsType The type of the options object which is passed to the constructor of the Coordinator Driver.
   * @param this The constructor of the class which extends `CoordinatorDriverBase`.
   * @param queue The name of the queue which the RabbitMQToBucketQueue instance is consuming from.
   * @param maxBatch The maximum number of items which can be sent in a single batch.
   * @param interval The minimum interval in milliseconds at which the RabbitMQToBucketQueue instance will send batches.
   * @param options Options for the underlying coordination driver.
   * @returns a promise which resolves to an instance of the class which extends `CoordinatorDriverBase`.
   */
  public static async initialize<CoordinatorDriverOptionsType = undefined>(
    this: new (
      queue: string,
      maxBatch: number,
      interval: number,
      options: CoordinatorDriverOptionsType
    ) => CoordinatorDriverBase<CoordinatorDriverOptionsType>,
    queue: string,
    maxBatch: number,
    interval: number,
    options: CoordinatorDriverOptionsType
  ): Promise<CoordinatorDriverBase<CoordinatorDriverOptionsType>> {
    const instance = new this(queue, maxBatch, interval, options)
    await instance.ready()
    return instance
  }

  /**
   * Prepare the coordinator for use. Should be extended by the coordinator if needed.
   * @param options The options for the coordinator driver.
   * @param expectClean If true, the method should throw an error if the coordinator is not clean.
   * @returns A promise which resolves to void if the coordinator is clean, or rejects if it is not but is expected to be.
   */
  public static async prepare(
    options: RMQBQ.DefaultCoordinatorOptions,
    expectClean: boolean = false
  ): Promise<void> {
    const dirty = await this.prepared(options)
    if (dirty && expectClean) {
      throw new Error('Coordinator is not clean')
    }
    return
  }

  /**
   * Clean up the coordinator after use. Should be extended by the coordinator if needed.
   * @param options The options for the coordinator driver.
   * @param expectDirty If true, the method should throw an error if the coordinator is not dirty.
   * @returns A promise which resolves to void if the coordinator is dirty, or rejects if it is not but is expected to be.
   */
  public static async cleanup(
    options: RMQBQ.DefaultCoordinatorOptions,
    expectDirty: boolean = false
  ): Promise<void> {
    const dirty = await this.prepared(options)
    if (!dirty && expectDirty) {
      throw new Error('Coordinator is clean')
    }
    return
  }

  /**
   * Check to see if the coordinator has been prepared. Should be extended by the coordinator if needed.
   * @param _options The options for the coordinator driver.
   * @returns A promise which resolves to true if the coordinator is prepared, or false if it is not.
   */
  public static async prepared(_options: RMQBQ.DefaultCoordinatorOptions): Promise<boolean> {
    return false
  }
}
