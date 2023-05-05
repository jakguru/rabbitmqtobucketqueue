import { io as IO } from 'socket.io-client'
import { Encryption } from './encryption'
import * as jwt from 'jsonwebtoken'
import type * as RMQBQ from 'contracts/RMQBQ'
import type * as SIO from 'socket.io-client'

export class CoordinationClient {
  readonly #queue: string
  readonly #client: SIO.Socket
  readonly #encryption: Encryption
  readonly #onBalanceUpdateCallback: (balance: number) => void
  readonly #onReady: () => void
  readonly #onReject: (reason: any) => void

  constructor(
    queue: string,
    maxBatch: number,
    interval: number,
    options: RMQBQ.LiteOptions,
    onBalanceUpdateCallback: (balance: number) => void,
    onReady: () => void,
    onReject: (reason: any) => void
  ) {
    this.#queue = queue
    const uri = [options.protocol, '://', options.host, ':', options.port].join('')
    this.#client = IO(uri, {
      path: options.path,
      autoConnect: false,
      auth: {
        token: jwt.sign({}, options.encryptionKey),
      },
      withCredentials: true,
    })
    this.#encryption = new Encryption(
      options.encryptionKey,
      'aes-256-cbc',
      options.allowInsecure === true
    )
    this.#onBalanceUpdateCallback = onBalanceUpdateCallback
    this.#onReady = onReady
    this.#onReject = onReject
    const balanceKey = ['queue', this.#queue, 'balance'].join(':')
    this.#client.onAny((e, ...a) => {
      const { event, args } = this.#decrypt(e, ...a)
      switch (event) {
        case balanceKey:
          this.#onBalanceUpdateCallback(args[0] as number)
          break
      }
    })
    this.#client.on('connect', () => {
      this.#onReady()
      this.#emit('coordinate', {
        queue,
        maxBatch,
        interval,
      })
    })
    this.#client.on('error', (err) => {
      console.warn(err)
    })
    this.#client.on('disconnect', (err) => {
      this.#onReject(err)
    })
    this.#client.connect()
  }

  public async increment(count: number): Promise<void> {
    const balanceKey = ['queue', this.#queue, 'balance'].join(':')
    const listener = (resolve, e, ...a) => {
      const { event, args } = this.#decrypt(e, ...a)
      switch (event) {
        case balanceKey:
          this.#onBalanceUpdateCallback(args[0] as number)
          resolve(true)
          break
      }
    }
    const confirmationPromise = new Promise<void>((resolve) => {
      this.#client.onAny(listener.bind(this, resolve))
    })
    this.#emit('increment', this.#queue, count)
    await confirmationPromise
    this.#client.offAny(listener)
  }

  public async reset(): Promise<void> {
    const balanceKey = ['queue', this.#queue, 'balance'].join(':')
    const listener = (resolve, e, ...a) => {
      const { event, args } = this.#decrypt(e, ...a)
      switch (event) {
        case balanceKey:
          this.#onBalanceUpdateCallback(args[0] as number)
          resolve(true)
          break
      }
    }
    const confirmationPromise = new Promise<void>((resolve) => {
      this.#client.onAny(listener.bind(this, resolve))
    })
    this.#emit('reset', this.#queue)
    await confirmationPromise
    this.#client.offAny(listener)
  }

  public async test(): Promise<boolean> {
    if (!this.#client.connected) {
      return false
    }
    const listener = (resolve, e, ...a) => {
      const { event } = this.#decrypt(e, ...a)
      switch (event) {
        case 'pong':
          resolve(true)
          break
      }
    }
    const passPromise = new Promise<boolean>((resolve) => {
      this.#client.onAny(listener.bind(this, resolve))
    })
    this.#emit('ping')
    const failPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 10000)
    })
    const res = await Promise.race([passPromise, failPromise])
    this.#client.offAny(listener)
    return res
  }

  public shutdown(): Promise<void> | undefined {
    if (this.#client.connected) {
      return new Promise((resolve) => {
        this.#client.on('disconnect', () => {
          resolve()
        })
        this.#client.disconnect()
      })
    }
  }

  #emit = (event: string, ...args: Array<any>) => {
    const encryptedEvent = this.#encryption.encrypt(event, 1000, 'event')
    const encryptedArgs = args.map((arg) => this.#encryption.encrypt(arg, 1000, event))
    this.#client.emit(encryptedEvent, ...encryptedArgs)
  }

  #decrypt = (event: string, ...args: Array<any>) => {
    const decryptedEvent = this.#encryption.decrypt<string>(event, 'event')
    const decryptedArgs = args.map((arg) => this.#encryption.decrypt(arg, decryptedEvent))
    return {
      event: decryptedEvent,
      args: args ? decryptedArgs : [],
    }
  }
}
