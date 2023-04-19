import { CoordinatorDriverBase } from '../../abstracts'
import { connect, Client } from 'mqtt'
import { v4 as uuidv4 } from 'uuid'
import { DateTime } from 'luxon'
import { CoordinatorTestFailedError } from '../CoordinatorTestFailedError'
import { Socket } from 'net'
import type * as RMQBQ from 'contracts/RMQBQ'

/**
 * The `MQTTCoordinator` class provides a coordinator which uses MQTT to ensure cross-process consistency of counts.
 * @experimental
 */
export class MQTTCoordinator extends CoordinatorDriverBase<RMQBQ.MQTTOptions> {
  readonly #store: Map<string, { count: number; expires: DateTime }> = new Map()
  readonly #client: Client
  readonly #connPromise: Promise<void>
  #connected: boolean = false

  /**
   * @private
   */
  constructor(queue: string, maxBatch: number, interval: number, options: RMQBQ.MQTTOptions) {
    super(queue, maxBatch, interval, options)
    const remainder = this.$interval % 1000
    if (remainder !== 0) {
      throw new Error(
        `MQTT requires intervals in round seconds represented as milliseconds. ${this.$interval} is not divisible by 1000.`
      )
    }
    this.#client = connect(options)
    this.#connPromise = new Promise((resolve, reject) => {
      let resolved = false
      this.#client.once('error', (err) => {
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })
      this.#client.once('message', () => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      })
    })
    this.#client.on('connect', this.#onConnection.bind(this))
    this.#client.on('close', this.#onClose.bind(this))
    this.#client.on('message', this.#onMessage.bind(this))
    this.#client.on('error', this.#onError.bind(this))
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.balance}
   */
  public get balance(): Promise<number> {
    return this.#getBalance()
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.ready}
   */
  public async ready(): Promise<void> {
    await this.#connPromise
    return
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.increment}
   */
  public async increment(count: number): Promise<void> {
    try {
      await Promise.race([
        this.#connPromise,
        new Promise((_resolve, reject) => setTimeout(reject, 1000, new Error('Timeout'))),
      ])
    } catch {}
    if (!this.#connected) {
      throw new Error('Not connected to MQTT Broker')
    }
    const uuid = uuidv4()
    const expires = DateTime.now().plus({ milliseconds: this.$interval })
    const topic = ['rmqbq', this.$queue, uuid].join('/')
    const res = await new Promise((resolve) => {
      this.#client.publish(
        topic,
        JSON.stringify({
          count,
          expires: expires.toISO(),
        }),
        {
          qos: 2,
          retain: true,
          dup: false,
          properties: {
            messageExpiryInterval: this.$interval / 1000,
          },
        },
        () => {
          resolve(undefined)
        }
      )
    })
    if (res instanceof Error) {
      throw res
    }
    this.#store.set(uuid, { count, expires })
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.reset}
   */
  public async reset(): Promise<void> {
    try {
      await Promise.race([
        this.#connPromise,
        new Promise((_resolve, reject) => setTimeout(reject, 1000, new Error('Timeout'))),
      ])
    } catch {}
    const topics = [...this.#store.keys()].map((uuid) => ['rmqbq', this.$queue, uuid].join('/'))
    const promises = topics.map((topic) => {
      return new Promise((resolve) => {
        this.#client.publish(topic, Buffer.alloc(0), { qos: 2, retain: true, dup: false }, () => {
          resolve(undefined)
        })
      })
    })
    await Promise.all(promises)
    this.#store.clear()
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.shutdown}
   */
  public async shutdown(): Promise<void> {
    try {
      await Promise.race([
        this.#connPromise,
        new Promise((_resolve, reject) => setTimeout(reject, 1000, new Error('Timeout'))),
      ])
    } catch {}
    // @ts-ignore
    for (const key in this.#client.outgoing) {
      // @ts-ignore
      if (this.#client.outgoing[key].volatile) {
        // @ts-ignore
        delete this.#client.outgoing[key]
      }
    }
    await new Promise((resolve) => {
      const topic = ['rmqbq', this.$queue, '+'].join('/')
      this.#client.unsubscribe(topic, {}, () => {
        resolve(undefined)
      })
    })
    await new Promise((resolve) => {
      this.#client.end(false, {}, () => {
        resolve(undefined)
      })
    })
  }

  /**
   * {@inheritDoc CoordinatorDriverBase.test}
   */
  public async test(): Promise<void> | never {
    try {
      await Promise.race([
        this.#connPromise,
        new Promise((_resolve, reject) => setTimeout(reject, 1000, new Error('Timeout'))),
      ])
    } catch (error) {
      throw new CoordinatorTestFailedError(error)
    }
    if (!this.#connected || !this.#clientConnected) {
      throw new CoordinatorTestFailedError('Not connected to MQTT Broker')
    }
  }

  get #clientConnected() {
    return this.#client.connected
  }

  async #getBalance(): Promise<number> {
    try {
      await Promise.race([
        this.#connPromise,
        new Promise((_resolve, reject) => setTimeout(reject, 1000, new Error('Timeout'))),
      ])
    } catch (e) {
      return 0
    }
    if (!this.#connected || !this.#clientConnected) {
      throw new Error('Not connected to MQTT Broker')
    }
    let sum = 0
    const now = DateTime.now()
    this.#store.forEach(({ count, expires }, uuid) => {
      if (expires < now) {
        this.#store.delete(uuid)
      } else {
        sum += count
      }
    })
    const balance = this.$maxBatch - sum
    return balance < 0 ? 0 : balance
  }

  #onConnection(connack) {
    // @ts-ignore
    if (this.#client.stream instanceof Socket) {
      // @ts-ignore
      this.#client.stream.on('error', this.#onError.bind(this))
    }
    this.#connected = true
    if (
      'object' !== connack ||
      null === connack ||
      'undefined' === typeof connack.sessionPresent ||
      true !== connack.sessionPresent
    ) {
      const topic = ['rmqbq', this.$queue, '+'].join('/')
      this.#client.subscribe(
        topic,
        {
          nl: false,
          qos: 2,
          rh: 0,
        },
        (err) => {
          if (err) {
            if ('Connection closed' === err.message) {
              return
            }
            throw err
          }
        }
      )
    }
  }

  #onMessage(topic, message) {
    const prefix = ['rmqbq', this.$queue].join('/')
    if (topic.startsWith(prefix)) {
      const uuid = topic.replace(`${prefix}/`, '')
      try {
        const { count, expires } = JSON.parse(message.toString())
        const expiresAt = DateTime.fromISO(expires)
        if (expiresAt > DateTime.now()) {
          this.#store.set(uuid, { count, expires: expiresAt })
        }
      } catch (err) {
        // ignore
      }
    }
  }

  #onClose() {
    this.#connected = false
    const topic = ['rmqbq', this.$queue, '+'].join('/')
    this.#client.unsubscribe(topic, {}, () => {})
  }

  #onError() {
    this.#client.end()
  }
}
