import { test } from '@japa/runner'
import { MQTTCoordinator } from '../../src/coordinators/mqtt'
import { mqttConnectionOptions } from '../common'

test.group('MQTTCoordinator', (group) => {
  group.tap((test) => test.tags(['coordinators', 'mqtt']))
  test('constructor sets properties correctly', ({ assert }) => {
    const coordinator = new MQTTCoordinator('test-queue', 5, 1000, mqttConnectionOptions)

    assert.equal(coordinator['$queue'], 'test-queue')
    assert.equal(coordinator['$maxBatch'], 5)
    assert.equal(coordinator['$interval'], 1000)
    assert.deepEqual(coordinator['$options'], mqttConnectionOptions)
    coordinator
      .shutdown()
      ?.then(() => {
        assert.isTrue(true)
      })
      .catch((error) => {
        assert.fail(error)
      })
  })

  test('constructor throws errors when intervals are not multiples of 1000', ({ assert }) => {
    try {
      new MQTTCoordinator('test-queue', 5, 500, mqttConnectionOptions)
      assert.fail('Should have thrown error')
      return
    } catch (error) {
      assert.equal(
        error.message,
        `MQTT requires intervals in round seconds represented as milliseconds. 500 is not divisible by 1000.`
      )
    }
    try {
      new MQTTCoordinator('test-queue', 5, 1001, mqttConnectionOptions)
      assert.fail('Should have thrown error')
      return
    } catch (error) {
      assert.equal(
        error.message,
        `MQTT requires intervals in round seconds represented as milliseconds. 1001 is not divisible by 1000.`
      )
    }
    try {
      new MQTTCoordinator('test-queue', 5, 5763, mqttConnectionOptions)
      assert.fail('Should have thrown error')
      return
    } catch (error) {
      assert.equal(
        error.message,
        `MQTT requires intervals in round seconds represented as milliseconds. 5763 is not divisible by 1000.`
      )
    }
  })

  test('balance returns correct value', async ({ assert }) => {
    const coordinator = new MQTTCoordinator('test-queue', 5, 1000, mqttConnectionOptions)

    assert.equal(await coordinator.balance, 5)
    await coordinator.increment(2)
    assert.equal(await coordinator.balance, 3)
    await coordinator.increment(3)
    assert.equal(await coordinator.balance, 0)
    await coordinator.increment(10)
    assert.equal(await coordinator.balance, 0)
    await coordinator.reset()
    assert.equal(await coordinator.balance, 5)
    await coordinator.shutdown()
  })

  test('increment increases total correctly', async ({ assert }) => {
    const coordinator = new MQTTCoordinator('test-queue', 5, 1000, mqttConnectionOptions)

    await coordinator.increment(1)
    assert.equal(await coordinator.balance, 4)
    await coordinator.increment(4)
    assert.equal(await coordinator.balance, 0)
    await coordinator.reset()
    await coordinator.shutdown()
  })

  test('total resets after interval', async ({ assert }) => {
    const interval = 1000
    const coordinator = new MQTTCoordinator('test-queue', 5, interval, mqttConnectionOptions)

    await coordinator.increment(2)
    assert.equal(await coordinator.balance, 3)

    await new Promise((resolve) => setTimeout(resolve, interval + 50))

    assert.equal(await coordinator.balance, 5)
    await coordinator.reset()
    await coordinator.shutdown()
  })
})
