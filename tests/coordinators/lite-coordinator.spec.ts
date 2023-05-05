import { test } from '@japa/runner'
import { LiteCoordinator } from '../../src/coordinators/lite'
import { liteConnectionOptions } from '../common'
import type * as RMQBQ from '../../contracts/RMQBQ'

test.group('LiteCoordinator', (group) => {
  group.tap((test) => test.tags(['coordinators', 'lite']))
  test('constructor sets properties correctly', async ({ assert }) => {
    const coordinator = await LiteCoordinator.initialize<RMQBQ.LiteOptions>(
      'test-queue',
      5,
      1000,
      liteConnectionOptions
    )

    assert.equal(coordinator['$queue'], 'test-queue')
    assert.equal(coordinator['$maxBatch'], 5)
    assert.equal(coordinator['$interval'], 1000)
    assert.deepEqual(coordinator['$options'], liteConnectionOptions)
    coordinator
      .shutdown()
      ?.then(() => {
        assert.isTrue(true)
      })
      .catch((error) => {
        assert.fail(error)
      })
  })

  test('able to connect to the lite server', async ({ assert }) => {
    const coordinator = await LiteCoordinator.initialize<RMQBQ.LiteOptions>(
      'test-queue',
      5,
      1000,
      liteConnectionOptions
    )
    await coordinator.shutdown()
  })

  test('balance returns correct value', async ({ assert }) => {
    const coordinator = await LiteCoordinator.initialize<RMQBQ.LiteOptions>(
      'test-queue',
      5,
      1000,
      liteConnectionOptions
    )
    await coordinator.reset()
    assert.equal(coordinator.balance, 5)
    await coordinator.increment(2)
    assert.equal(coordinator.balance, 3)
    await coordinator.increment(3)
    assert.equal(coordinator.balance, 0)
    await coordinator.increment(10)
    assert.equal(coordinator.balance, 0)
    await coordinator.reset()
    assert.equal(coordinator.balance, 5)
    await coordinator.shutdown()
  })

  test('increment increases total correctly', async ({ assert }) => {
    const coordinator = await LiteCoordinator.initialize<RMQBQ.LiteOptions>(
      'test-queue',
      5,
      1000,
      liteConnectionOptions
    )
    await coordinator.reset()
    await coordinator.increment(1)
    assert.equal(coordinator.balance, 4)
    await coordinator.increment(4)
    assert.equal(coordinator.balance, 0)
    await coordinator.reset()
    await coordinator.shutdown()
  })

  test('total resets after interval', async ({ assert }) => {
    const interval = 1000
    const coordinator = await LiteCoordinator.initialize<RMQBQ.LiteOptions>(
      'test-queue',
      5,
      interval,
      liteConnectionOptions
    )
    await coordinator.reset()
    await coordinator.increment(2)
    assert.equal(coordinator.balance, 3)

    await new Promise((resolve) => setTimeout(resolve, interval + 50))

    assert.equal(coordinator.balance, 5)
    await coordinator.reset()
    await coordinator.shutdown()
  })
})
