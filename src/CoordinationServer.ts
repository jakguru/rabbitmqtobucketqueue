import { Server } from 'http'
import { Server as IO } from 'socket.io'
import { MemoryCoordinator } from './coordinators'
import { Encryption } from './encryption'
import * as jwt from 'jsonwebtoken'
import type * as SIO from 'socket.io'

export class CoordinationServer {
  readonly #io: IO
  readonly #encryptionKey: string
  readonly #sockets: Map<string, SIO.Socket> = new Map()
  readonly #coordinators: Map<string, MemoryCoordinator> = new Map()
  readonly #encryption: Encryption
  #interval: NodeJS.Timeout | undefined = undefined
  #onNextTick: NodeJS.Immediate | undefined = undefined

  constructor(
    encryptionKey: string,
    httpServer?: Server,
    path: string = '/rmqbqc/',
    allowInsecure = false
  ) {
    this.#io = new IO(httpServer!, {
      cleanupEmptyChildNamespaces: true,
      path,
      serveClient: false,
      cors: {
        origin: true,
        credentials: true,
      },
    })
    this.#io.on('connection', this.#onSocketConnect.bind(this))
    this.#encryptionKey = encryptionKey
    this.#encryption = new Encryption(encryptionKey, 'aes-256-cbc', allowInsecure)
    this.#interval = setInterval(this.#onInterval, 100)
    this.#onInterval()
  }

  public get balances(): Map<string, number> {
    const balances = new Map<string, number>()
    this.#coordinators.forEach((coordinator, queue) => {
      balances.set(queue, coordinator.balance)
    })
    return balances
  }

  public broadcast(event: string, ...args: Array<any>) {
    this.#broadcast(event, ...args)
  }

  #broadcast = (event: string, ...args: Array<any>) => {
    const encryptedEvent = this.#encryption.encrypt(event, 1000, 'event')
    const encryptedArgs = args.map((arg) => this.#encryption.encrypt(arg, 1000, event))
    this.#sockets.forEach((socket) => socket.emit(encryptedEvent, ...encryptedArgs))
  }

  #emit = (socket: SIO.Socket, event: string, ...args: Array<any>) => {
    const encryptedEvent = this.#encryption.encrypt(event, 1000, 'event')
    const encryptedArgs = args.map((arg) => this.#encryption.encrypt(arg, 1000, event))
    socket.emit(encryptedEvent, ...encryptedArgs)
  }

  #onInterval = () => {
    this.#coordinators.forEach((coordinator, queue) => {
      const event = ['queue', queue, 'balance'].join(':')
      this.#broadcast(event, coordinator.balance)
    })
  }

  #onSocketConnect = async (socket: SIO.Socket) => {
    const { handshake } = socket
    try {
      await jwt.verify(handshake.auth.token, this.#encryptionKey)
    } catch (e) {
      socket.emit('error', new Error('Authentication Failed'))
      socket.disconnect(true)
    }
    socket.onAny((event, ...args) => this.#onSocketEvent(socket, event, ...args))
    socket.on('disconnect', this.#onSocketDisconnect.bind(this, socket))
    this.#sockets.set(socket.id, socket)
    this.#coordinators.forEach((coordinator, queue) => {
      const event = ['queue', queue, 'balance'].join(':')
      this.#emit(socket, event, coordinator.balance)
    })
  }

  #onSocketDisconnect = (socket: SIO.Socket) => {
    this.#sockets.delete(socket.id)
  }

  #onSocketEvent = async (socket: SIO.Socket, event: string, ...args: Array<any>) => {
    const decryptedEvent = this.#encryption.decrypt<string>(event, 'event')
    if ('undefined' === typeof decryptedEvent) {
      return socket.emit('error', 'Invalid Event')
    }
    const decryptedArgs = args
      .filter((arg) => typeof arg === 'string')
      .map((arg) => this.#encryption.decrypt(arg, decryptedEvent))

    switch (decryptedEvent) {
      case 'coordinate':
        try {
          this.#initializeNewCoordinator(decryptedArgs[0])
        } catch (err) {
          socket.emit('error', err.message)
        }
        break

      case 'increment':
        try {
          this.#incrementBalance(decryptedArgs)
        } catch (err) {
          socket.emit('error', err.message)
        }
        break

      case 'reset':
        try {
          this.#resetBalance(decryptedArgs)
        } catch (err) {
          socket.emit('error', err.message)
        }
        break

      case 'ping':
        try {
          this.#emit(socket, 'pong')
        } catch (err) {
          socket.emit('error', err.message)
        }
        break
    }
  }

  #initializeNewCoordinator = (decryptedArg: any) => {
    if ('object' !== typeof decryptedArg || null === decryptedArg) {
      throw new Error('Invalid coordinator configuration')
    }
    const { queue, maxBatch, interval } = decryptedArg
    if ('string' !== typeof queue || queue.length === 0) {
      throw new Error('Invalid coordinator configuration')
    }
    if ('number' !== typeof maxBatch || maxBatch < 1) {
      throw new Error('Invalid coordinator configuration')
    }
    if ('number' !== typeof interval || interval < 1) {
      throw new Error('Invalid coordinator configuration')
    }
    if (this.#coordinators.has(queue)) {
      return
    }
    this.#coordinators.set(queue, new MemoryCoordinator(queue, maxBatch, interval))
  }

  #incrementBalance = (decryptedArgs: unknown[]) => {
    const [queue, amount] = decryptedArgs
    if ('string' !== typeof queue || queue.length === 0) {
      throw new Error('Invalid coordinator')
    }
    if ('number' !== typeof amount || amount < 1) {
      throw new Error('Invalid amount')
    }
    const coordinator = this.#coordinators.get(queue)
    if ('undefined' === typeof coordinator) {
      throw new Error('Invalid coordinator')
    }
    coordinator.increment(amount)
    if ('undefined' === typeof this.#onNextTick) {
      this.#onNextTick = setImmediate(this.#onInterval)
    }
  }

  #resetBalance = (decryptedArgs: unknown[]) => {
    const [queue] = decryptedArgs
    if ('string' !== typeof queue || queue.length === 0) {
      throw new Error('Invalid coordinator')
    }
    const coordinator = this.#coordinators.get(queue)
    if ('undefined' === typeof coordinator) {
      throw new Error('Invalid coordinator')
    }
    coordinator.reset()
    if ('undefined' === typeof this.#onNextTick) {
      this.#onNextTick = setImmediate(this.#onInterval)
    }
  }
}
