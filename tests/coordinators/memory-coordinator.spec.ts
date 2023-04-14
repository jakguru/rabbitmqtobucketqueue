import { test } from '@japa/runner'
import { MemoryCoordinator } from '../../src/coordinators/memory'

test.group('MemoryCoordinator', () => {
  test('constructor sets properties correctly', ({ assert }) => {
    const coordinator = new MemoryCoordinator('test-queue', 5, 1000)

    assert.equal(coordinator['$queue'], 'test-queue')
    assert.equal(coordinator['$maxBatch'], 5)
    assert.equal(coordinator['$interval'], 1000)
    assert.isUndefined(coordinator['$options'])
    coordinator
      .shutdown()
      ?.then(() => {
        assert.isTrue(true)
      })
      .catch((error) => {
        assert.fail(error)
      })
  })

  test('balance returns correct value', ({ assert }) => {
    const coordinator = new MemoryCoordinator('test-queue', 5, 1000)

    assert.equal(coordinator.balance, 5)
    coordinator.increment(2)
    assert.equal(coordinator.balance, 3)
    coordinator.increment(3)
    assert.equal(coordinator.balance, 0)
    coordinator.reset()
    assert.equal(coordinator.balance, 5)
  })

  test('increment increases total correctly', ({ assert }) => {
    const coordinator = new MemoryCoordinator('test-queue', 5, 1000)

    coordinator.increment(1)
    assert.equal(coordinator.balance, 4)
    coordinator.increment(4)
    assert.equal(coordinator.balance, 0)
  })

  test('total resets after interval', async ({ assert }) => {
    const interval = 500
    const coordinator = new MemoryCoordinator('test-queue', 5, interval)

    coordinator.increment(2)
    assert.equal(coordinator.balance, 3)

    await new Promise((resolve) => setTimeout(resolve, interval + 50))

    assert.equal(coordinator.balance, 5)
  })
})
