import { test } from '@japa/runner'
import merge from 'lodash.merge'
import amqplib from 'amqplib'
import { RabbitMQToBucketQueue } from '../../src/RabbitMQToBucketQueue'
import * as options from '../common'
import type * as RMQBQ from '../../contracts/RMQBQ'

class StdClass {}

export function DoVariationTests<T = Buffer>(variation: string, configuration: RMQBQ.Config<T>) {
  const promise = RabbitMQToBucketQueue.initialize<T>(configuration)

  test(`${variation} - Booting`, async ({ assert }) => {
    const instance = await promise
    assert.instanceOf(instance, RabbitMQToBucketQueue)
  })

  test(`${variation} - Purging clears all enqueued items`, async ({ assert }) => {
    const instance = await promise
    await instance.purge()
    const awaiting = await instance.balance
    assert.equal(awaiting, configuration.maxBatch)
  })
}

export function MakeConfigForCoordinator(
  base: any,
  coordinator: string,
  onSpill: boolean = true,
  makeChannel: boolean | string = false,
  dbOptions = options.sqlite3ConnectionOptions,
  rmqChannelOverride?: amqplib.Channel | amqplib.ConfirmChannel
) {
  const cfg = merge({}, base)
  cfg.coordinator = coordinator
  switch (coordinator) {
    case 'memory':
      delete cfg.redisOptions
      delete cfg.mqttOptions
      delete cfg.databaseOptions
      break
    case 'redis':
      delete cfg.mqttOptions
      delete cfg.databaseOptions
      break
    case 'mqtt':
      delete cfg.redisOptions
      delete cfg.databaseOptions
      break
    case 'database':
      cfg.databaseOptions = dbOptions
      delete cfg.redisOptions
      delete cfg.mqttOptions
      break
  }
  if (makeChannel) {
    delete cfg.rmqChannel
    delete cfg.rmqQueueType
    if (makeChannel === 'confirmChannel') {
      cfg.rmqQueueType = 'confirmChannel'
    }
  } else {
    if (rmqChannelOverride) {
      cfg.rmqChannel = rmqChannelOverride
    }
    delete cfg.rmqConfirmChannel
    delete cfg.rmqConnectionOptions
    delete cfg.rmqQueueOptions
  }
  if (onSpill) {
    delete cfg.onItem
  } else {
    delete cfg.onSpill
  }
  return cfg
}

function GenerateBadObjectValues(obj) {
  const badValues: Set<any> = new Set()
  for (const key in obj) {
    const o: any = {}
    obj[key].forEach((bv: unknown) => {
      o[key] = bv
      badValues.add(Object.assign({}, o))
      for (const k in obj) {
        if (k !== key) {
          obj[k].forEach((bv2: unknown) => {
            o[k] = bv2
            badValues.add(Object.assign({}, o))
          })
        }
      }
    })
  }
  return badValues
}

export function GetBadValuesForKey(key) {
  const badValues: Set<unknown> = new Set()
  switch (key) {
    case 'queue':
      badValues.add('')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'rmqChannel':
      badValues.add('')
      badValues.add('test-channel')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'rmqQueueType':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'rmqConnectionOptions':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      GenerateBadObjectValues({
        protocol: new Set([
          '',
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        hostname: new Set([
          '',
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        port: new Set([
          '',
          '1234',
          -1,
          0,
          0.1,
          65536,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        username: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        password: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        locale: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        frameMax: new Set([
          '',
          '1234',
          -1,
          0.1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        heartbeat: new Set([
          '',
          '1234',
          -1,
          0.1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        vhost: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
      }).forEach((badValue) => badValues.add(badValue))
      break
    case 'rmqQueueOptions':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      GenerateBadObjectValues({
        exclusive: new Set([
          '',
          '1234',
          0,
          BigInt(1),
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        durable: new Set([
          '',
          '1234',
          0,
          BigInt(1),
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        autodelete: new Set([
          '',
          '1234',
          0,
          BigInt(1),
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        messageTtl: new Set([
          '',
          '1234',
          -1,
          0.1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        expires: new Set([
          '',
          '1234',
          -1,
          0.1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        deadLetterExchange: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        deadLetterRoutingKey: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        maxLength: new Set([
          '',
          '1234',
          -1,
          0.1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        maxPriority: new Set([
          '',
          '1234',
          -1,
          0.1,
          256,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
      }).forEach((badValue) => badValues.add(badValue))
      break
    case 'coordinator':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'redisOptions':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      GenerateBadObjectValues({
        host: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test-protocol'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        port: new Set([
          '',
          '1234',
          -1,
          0,
          0.1,
          65536,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        db: new Set([
          '',
          '1234',
          -1,
          0.1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
      }).forEach((badValue) => badValues.add(badValue))
      GenerateBadObjectValues({
        path: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
      }).forEach((badValue) => badValues.add(badValue))
      break
    case 'mqttOptions':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      GenerateBadObjectValues({
        host: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        port: new Set([
          '',
          '1234',
          -1,
          0,
          0.1,
          65536,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        protocol: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
      }).forEach((badValue) => badValues.add(badValue))
      break
    case 'databaseOptions':
      badValues.add('')
      badValues.add('test-type')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add(true)
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      GenerateBadObjectValues({
        table: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        client: new Set([
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
        connection: new Set([
          'test',
          1,
          BigInt(1),
          true,
          {},
          [],
          () => {},
          Symbol('test'),
          null,
          void 0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          new StdClass(),
          Buffer.alloc(0),
        ]),
      }).forEach((badValue) => badValues.add(badValue))
      break
    case 'debug':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'interval':
      badValues.add('test')
      badValues.add(1)
      badValues.add(true)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'maxBatch':
      badValues.add('test')
      badValues.add(0)
      badValues.add(100000)
      badValues.add(true)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'chunkSize':
      badValues.add('test')
      badValues.add(0)
      badValues.add(1000000)
      badValues.add(true)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'discardOnDeserializeError':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'discardOnValidationError':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'discardOnInvalid':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(() => {})
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'validateItem':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(true)
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'deserializeItem':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(true)
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'onSpill':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(true)
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
    case 'onItem':
      badValues.add('test')
      badValues.add(1)
      badValues.add(Buffer.alloc(0))
      badValues.add(BigInt(1))
      badValues.add({})
      badValues.add([])
      badValues.add(true)
      badValues.add(null)
      badValues.add(void 0)
      badValues.add(NaN)
      badValues.add(Infinity)
      badValues.add(-Infinity)
      badValues.add(undefined)
      badValues.add(new StdClass())
      break
  }
  return badValues
}
