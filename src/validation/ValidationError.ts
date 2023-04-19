/**
 * A special error class which can let the bucket know if the message should be re-enqueued or not.
 */
export class ValidationError extends Error {
  readonly #errors: string[]
  constructor(message: string, errors: string[]) {
    super(message)
    Object.setPrototypeOf(this, ValidationError.prototype)
    this.#errors = errors
  }

  /**
   * Whether the message should be re-enqueued or not.
   */
  public get errors(): string[] {
    return this.#errors
  }
}
