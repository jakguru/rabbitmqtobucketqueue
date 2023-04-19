import { test } from '@japa/runner'
import { RedisCoordinator } from '../../src/coordinators/redis'
import { redisConnectionOptions } from '../common'

test.group('RedisCoordinator', (group) => {
  group.tap((test) => test.tags(['coordinators', 'redis']))
  test('constructor sets properties correctly', ({ assert }) => {
    const coordinator = new RedisCoordinator('test-queue', 5, 1000, redisConnectionOptions)

    assert.equal(coordinator['$queue'], 'test-queue')
    assert.equal(coordinator['$maxBatch'], 5)
    assert.equal(coordinator['$interval'], 1000)
    assert.deepEqual(coordinator['$options'], redisConnectionOptions)
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
      new RedisCoordinator('test-queue', 5, 500, redisConnectionOptions)
      assert.fail('Should have thrown error')
      return
    } catch (error) {
      assert.equal(
        error.message,
        `Redis requires intervals in round seconds represented as milliseconds. 500 is not divisible by 1000.`
      )
    }
    try {
      new RedisCoordinator('test-queue', 5, 1001, redisConnectionOptions)
      assert.fail('Should have thrown error')
      return
    } catch (error) {
      assert.equal(
        error.message,
        `Redis requires intervals in round seconds represented as milliseconds. 1001 is not divisible by 1000.`
      )
    }
    try {
      new RedisCoordinator('test-queue', 5, 5763, redisConnectionOptions)
      assert.fail('Should have thrown error')
      return
    } catch (error) {
      assert.equal(
        error.message,
        `Redis requires intervals in round seconds represented as milliseconds. 5763 is not divisible by 1000.`
      )
    }
  })

  test('balance returns correct value', async ({ assert }) => {
    const coordinator = new RedisCoordinator('test-queue', 5, 1000, redisConnectionOptions)

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
    const coordinator = new RedisCoordinator('test-queue', 5, 1000, redisConnectionOptions)

    await coordinator.increment(1)
    assert.equal(await coordinator.balance, 4)
    await coordinator.increment(4)
    assert.equal(await coordinator.balance, 0)
    await coordinator.reset()
    await coordinator.shutdown()
  })

  test('total resets after interval', async ({ assert }) => {
    const interval = 1000
    const coordinator = new RedisCoordinator('test-queue', 5, interval, redisConnectionOptions)

    await coordinator.increment(2)
    assert.equal(await coordinator.balance, 3)

    await new Promise((resolve) => setTimeout(resolve, interval + 50))

    assert.equal(await coordinator.balance, 5)
    await coordinator.reset()
    await coordinator.shutdown()
  })
})
