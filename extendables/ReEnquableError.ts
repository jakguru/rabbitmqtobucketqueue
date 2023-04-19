/**
 * A special error class which can let the bucket know if the message should be re-enqueued or not.
 */
export class ReEnquableError extends Error {
  readonly #reenqueue: boolean
  constructor(message: string, reenqueue: boolean = true) {
    super(message)
    Object.setPrototypeOf(this, ReEnquableError.prototype)
    this.#reenqueue = reenqueue
  }

  /**
   * Whether the message should be re-enqueued or not.
   */
  public get reenqueue(): boolean {
    return this.#reenqueue
  }

  /**
   * Whether the message should be re-enqueued or not.
   * @alias reenqueue
   */
  public get requeue(): boolean {
    return this.#reenqueue
  }
}
