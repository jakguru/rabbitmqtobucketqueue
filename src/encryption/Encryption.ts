import { Buffer } from 'buffer'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import * as jwt from 'jsonwebtoken'
import { base64 } from './Base64'
import { Hmac } from './Hmac'
import { DateTime } from 'luxon'

export class Encryption {
  readonly #algorithm: 'aes-256-cbc' | 'aes-128-cbc'
  readonly #jwtkey: string
  readonly #key: Buffer
  readonly #hmac: Hmac

  constructor(
    key: string,
    algorithm: 'aes-256-cbc' | 'aes-128-cbc' = 'aes-256-cbc',
    allowInsecure = false
  ) {
    this.#algorithm = algorithm
    if (key.length < 16 && !allowInsecure) {
      throw new Error('Insecure Encryption key. Must be at least 16 characters long.')
    }
    this.#jwtkey = key
    this.#key = createHash('sha256').update(key).digest()
    this.#hmac = new Hmac(this.#key)
  }

  public encrypt(value: any, expiresAt: string | number, purpose?: string) {
    const iv = this.#generateRandom(16)
    const cipher = createCipheriv(this.#algorithm, this.#key, iv)
    const encoded = jwt.sign(
      {
        data: value,
        exp: DateTime.now()
          .plus({ seconds: parseInt(expiresAt.toString()) })
          .toSeconds(),
        notBefore: DateTime.now().toSeconds(),
        subject: purpose,
      },
      this.#jwtkey
    )
    const encrypted = Buffer.concat([cipher.update(encoded, 'utf8'), cipher.final()])
    const result = [base64.urlEncode(encrypted), base64.urlEncode(iv)].join('.')
    return [result, base64.urlEncode(this.#hmac.generate(result))].join('.')
  }

  public decrypt<T>(value: string, purpose?: string): T | undefined {
    const [encryptedEncoded, ivEncoded] = value.split('.')
    const [encrypted, iv, hmac] = value
      .split('.')
      .map((v, i) => base64.urlDecode(v, i === 0 ? 'base64' : undefined))
    if (!encrypted || !iv || !hmac) {
      return undefined
    }
    const hmacValid = this.#hmac.compare([encryptedEncoded, ivEncoded].join('.'), hmac)
    if (!hmacValid) {
      return undefined
    }
    try {
      const decipher = createDecipheriv(this.#algorithm, this.#key, iv)
      const deciphered = decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8')
      const decoded = jwt.verify(deciphered, this.#jwtkey)
      if (
        (purpose && decoded.subject !== purpose) ||
        ('string' === typeof decoded.subject && decoded.subject.length > 0 && !purpose)
      ) {
        return undefined
      }
      return decoded.data
    } catch (e) {
      return undefined
    }
  }

  #generateRandom(size: number) {
    const bits = (size + 1) * 6
    const buffer = randomBytes(Math.ceil(bits / 8))
    return this.#normalizeBase64(buffer.toString('base64')).slice(0, size)
  }

  #normalizeBase64(value: string) {
    return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '')
  }
}
