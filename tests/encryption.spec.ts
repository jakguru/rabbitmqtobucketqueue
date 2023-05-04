import { test } from '@japa/runner'
import { Encryption } from '../src/encryption/Encryption'

const secureKey = 'testkey1234567890abcdefghijklmno'
const insecureKey = 'testkey1234'
const algorithm = 'aes-256-cbc'

test.group('Encryption', (group) => {
  group.tap((test) => {
    test.tags(['encryption'])
  })
  test('constructor', ({ assert }) => {
    const encryption = new Encryption(secureKey)
    assert.instanceOf(encryption, Encryption)
    assert.throws(
      () => new Encryption(insecureKey),
      'Insecure Encryption key. Must be at least 16 characters long.'
    )
    assert.doesNotThrows(() => new Encryption(insecureKey, algorithm, true))
  })

  test('encrypt and decrypt', ({ assert }) => {
    const encryption = new Encryption(secureKey)
    const data = { example: 'data' }
    const purpose = 'test-purpose'
    const expiresIn = 3600

    const encrypted = encryption.encrypt(data, expiresIn, purpose)
    assert.isDefined(encrypted)
    assert.isString(encrypted)

    const decrypted = encryption.decrypt<{ example: string }>(encrypted, purpose)
    assert.isDefined(decrypted)
    assert.isObject(decrypted)
    assert.deepEqual(decrypted, data)
  })

  test('decrypt with invalid HMAC', ({ assert }) => {
    const encryption = new Encryption(secureKey)
    const data = { example: 'data' }
    const purpose = 'test-purpose'
    const expiresIn = 3600

    const encrypted = encryption.encrypt(data, expiresIn, purpose)
    assert.isDefined(encrypted)
    assert.isString(encrypted)

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const [_, iv, hmac] = encrypted.split('.')
    const fakeEncrypted = `fake${encrypted.slice(4)}`
    const fakeValue = [fakeEncrypted, iv, hmac].join('.')
    const decrypted = encryption.decrypt<{ example: string }>(fakeValue, purpose)
    assert.isUndefined(decrypted)
  })

  test('decrypt with invalid purpose', ({ assert }) => {
    const encryption = new Encryption(secureKey)
    const data = { example: 'data' }
    const purpose = 'test-purpose'
    const expiresIn = 3600

    const encrypted = encryption.encrypt(data, expiresIn, purpose)
    assert.isDefined(encrypted)
    assert.isString(encrypted)

    const decrypted = encryption.decrypt<{ example: string }>(encrypted, 'invalid-purpose')
    assert.isUndefined(decrypted)
  })

  test('decrypt with invalid value', ({ assert }) => {
    const encryption = new Encryption(secureKey)
    const data = { example: 'data' }
    const purpose = 'test-purpose'
    const expiresIn = 3600

    const encrypted = encryption.encrypt(data, expiresIn, purpose)
    assert.isDefined(encrypted)
    assert.isString(encrypted)

    const decrypted = encryption.decrypt<{ example: string }>('invalid.value', purpose)
    assert.isUndefined(decrypted)
  })
})
