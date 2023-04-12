/**
 * The CoordinatorDriver interface is used to define the methods that a CoordinatorDriver must implement.
 * A coordination driver is responsible for coordinating between multiple processes of RabbitMQToBucketQueue which are consuming
 * from the same queue.
 */
export interface CoordinatorDriver {
  /**
   * The remaining quota of items which can be consumed without exceeding the maximum batch size.
   */
  balance: number | Promise<number>

  /**
   * Inform the coordinator that a certain number of items has been sent
   * @param count The number of items to increment the counter by.
   */
  increment(count: number): void | Promise<void>
}
