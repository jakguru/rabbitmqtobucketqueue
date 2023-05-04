import { EventEmitter } from 'events'
import amqplib from 'amqplib'
import type * as Contracts from './Contracts'

export class Connection extends EventEmitter implements Contracts.Connection {
  readonly #options: amqplib.Options.Connect
  readonly #callback?: Contracts.ConstructorCallback
  #connection?: amqplib.Connection
  #closed: boolean = true

  private constructor(options: amqplib.Options.Connect, callback?: Contracts.ConstructorCallback) {
    super({ captureRejections: true })
    this.#options = options
    this.#callback = callback
    this.#initialize()
  }

  public get connection(): Contracts.ConnectionNetConnection {
    if (!this.#connection) {
      throw new Error('Connection is not initialized')
    }
    return this.#connection.connection
  }

  public async close(): Promise<void> {
    if (this.#closed) return
    if (!this.#connection) return
    this.#closed = true
    await this.#connection.close()
    this.emit('close')
  }

  public async createChannel(): Promise<amqplib.Channel> {
    if (!this.#connection) throw new Error('Connection is not initialized')
    return await this.#connection.createChannel()
  }
  public async createConfirmChannel(): Promise<amqplib.ConfirmChannel> {
    if (!this.#connection) throw new Error('Connection is not initialized')
    return await this.#connection.createConfirmChannel()
  }

  async #initialize(): Promise<void> {
    try {
      this.#connection = await amqplib.connect(this.#options)
      this.#connection.on('close', () => {
        this.#closed = true
        this.emit('close')
      })
      this.#connection.on('error', (error) => {
        this.#closed = true
        this.emit('error', error)
      })
      this.#connection.on('blocked', (reason) => {
        this.emit('blocked', reason)
      })
      this.#connection.on('unblocked', () => {
        this.emit('unblocked')
      })
      this.#closed = false
      this.emit('connect', this.#connection)
      if (this.#callback) this.#callback(undefined, this)
    } catch (error) {
      if (this.#callback) this.#callback(error, this)
      else this.emit('error', error)
    }
  }

  public static async connect(
    options: amqplib.Options.Connect,
    callback?: Contracts.ConstructorCallback
  ): Promise<Connection | void> {
    try {
      const instance: Connection = await new Promise((resolve, reject) => {
        new Connection(options, (error, connection) => {
          if (error) return reject(error)
          resolve(connection as Connection)
        })
      })
      if (callback) {
        callback(undefined, instance)
      }
      return instance
    } catch (error) {
      if (callback) callback(error, undefined)
      else throw error
    }
  }
}
