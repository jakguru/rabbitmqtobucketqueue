import { test } from '@japa/runner'
import amqplib from 'amqplib'

test.group('Test Suite', () => {
  test('Docker is loaded and available', ({ assert, docker }) => {
    assert.isObject(docker)
  })

  test('RabbitMQ is accessible', async ({ assert }) => {
    try {
      console.log('Creating Connection')
      const connection = await amqplib.connect(
        {
          protocol: 'amqp',
          hostname: 'localhost',
          port: 5672,
          username: 'guest',
          password: 'guest',
          vhost: '/',
        },
        {
          timeout: 1000,
        }
      )
      if (connection instanceof Error) {
        throw connection
      }
      assert.isOk(connection)
      console.log('Closing Connection')
      await connection.close()
      console.log('Connection Closed')
      return
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })
})
