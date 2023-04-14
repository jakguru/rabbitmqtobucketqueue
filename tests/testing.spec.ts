import { test } from '@japa/runner'
import amqplib from 'amqplib'
import { Redis } from 'ioredis'
import knex from 'knex'
import { connect, AsyncClient } from 'async-mqtt'
import { DateTime } from 'luxon'
import * as options from './common'

test.group('All Services are Available', () => {
  test('RabbitMQ is accessible', async ({ assert }) => {
    try {
      const connection = await amqplib.connect(
        options.amqplibConnectionOptions,
        options.amqplibConnectionSocketOptions
      )
      if (connection instanceof Error) {
        throw connection
      }
      assert.isOk(connection)
      await connection.close()
      return
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('Redis is accessible', async ({ assert }) => {
    try {
      const client = new Redis(options.redisConnectionOptions)
      const res = await client.ping()
      assert.equal(res, 'PONG')
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('PostgreSQL is accessible', async ({ assert }) => {
    const client = knex(options.postgresConnectionOptions)
    try {
      const res = await client.select(client.raw('version()'))
      assert.isArray(res)
      assert.isNotEmpty(res)
      assert.isObject(res[0])
      assert.isNotNull(res[0])
      assert.isString(res[0].version)
      assert.isNotEmpty(res[0].version)
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('MySQL is accessible', async ({ assert }) => {
    const client = knex(options.mysqlConnectionOptions)
    try {
      const res = await client.select(client.raw('version()'))
      assert.isArray(res)
      assert.isNotEmpty(res)
      assert.isObject(res[0])
      assert.isNotNull(res[0])
      assert.isString(res[0]['version()'])
      assert.isNotEmpty(res[0]['version()'])
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('SQLite is accessible', async ({ assert }) => {
    const client = knex(options.sqlite3ConnectionOptions)
    try {
      const res = await client.select(client.raw('date()'))
      assert.isArray(res)
      assert.isNotEmpty(res)
      assert.isObject(res[0])
      assert.isNotNull(res[0])
      assert.isString(res[0]['date()'])
      assert.isNotEmpty(res[0]['date()'])
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('MQTT is accessible', async ({ assert }) => {
    let client: AsyncClient | undefined
    const raceConditions: Promise<any>[] = [
      new Promise((resolve) => setTimeout(resolve, 1000, false)),
    ]
    try {
      client = await connect(options.mqttConnectionOptions)
      client.subscribe('connection-test')
      const messagePromise = new Promise((resolve) => {
        client?.on('message', (topic, message) => {
          if (topic === 'connection-test') {
            resolve(message)
          }
        })
      })
      raceConditions.push(messagePromise)
    } catch (error) {
      assert.fail(error.message)
      return
    }
    try {
      await client.publish('connection-test', DateTime.now().toJSON() as string)
      await client.end()
    } catch (error) {
      assert.fail(error.message)
      return
    }
    const result = await Promise.race(raceConditions)
    assert.isNotBoolean(result, 'MQTT did not receive published message within 1 second')
  })
})
