import { createHmac } from 'crypto'
import { base64 } from './Base64'
import { safeEqual } from './SafeEqual'

export class Hmac {
  readonly #key: Buffer
  constructor(key) {
    this.#key = key
  }
  /**
   * Generate the hmac
   */
  public generate(value) {
    return base64.urlEncode(createHmac('sha256', this.#key).update(value).digest())
  }
  /**
   * Compare raw value against an existing hmac
   */
  public compare(value, existingHmac) {
    return safeEqual(this.generate(value), existingHmac)
  }
}
