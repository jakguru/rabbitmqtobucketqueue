import { test } from '@japa/runner'
import { DatabaseCoordinator } from '../../src/coordinators/database'
import { postgresConnectionOptions } from '../common'
import type * as RMQBQ from '../../contracts/RMQBQ'

test.group('DatabaseCoordinator', (group) => {
  group.tap((test) => test.tags(['coordinators', 'database']))
  test('is able to create the required table', async ({ assert }) => {
    try {
      await DatabaseCoordinator.prepare(postgresConnectionOptions)
    } catch (error) {
      assert.fail(error.message)
      return
    }
    try {
      const prepared = await DatabaseCoordinator.prepared(postgresConnectionOptions)
      assert.isTrue(prepared, 'DatabaseCoordinator.prepare did not create the table correctly.')
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('is able to remove the table it created', async ({ assert }) => {
    try {
      await DatabaseCoordinator.prepare(postgresConnectionOptions)
    } catch (error) {
      assert.fail(error.message)
      return
    }
    try {
      const prepared = await DatabaseCoordinator.prepared(postgresConnectionOptions)
      assert.isTrue(prepared, 'DatabaseCoordinator.prepare did not create the table correctly.')
    } catch (error) {
      assert.fail(error.message)
      return
    }
    try {
      await DatabaseCoordinator.cleanup(postgresConnectionOptions)
    } catch (error) {
      assert.fail(error.message)
      return
    }
    try {
      const prepared = await DatabaseCoordinator.prepared(postgresConnectionOptions)
      assert.isFalse(prepared, 'DatabaseCoordinator.prepare did not remove the table correctly.')
    } catch (error) {
      assert.fail(error.message)
      return
    }
  })

  test('constructor sets properties correctly', async ({ assert }) => {
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      1000,
      postgresConnectionOptions
    )

    assert.equal(coordinator['$queue'], 'test-queue')
    assert.equal(coordinator['$maxBatch'], 5)
    assert.equal(coordinator['$interval'], 1000)
    assert.deepEqual(coordinator['$options'], postgresConnectionOptions)
    coordinator
      .shutdown()
      ?.then(() => {
        assert.isTrue(true)
      })
      .catch((error) => {
        assert.fail(error)
      })
  })

  test('balance returns correct value', async ({ assert }) => {
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      1000,
      postgresConnectionOptions
    )

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
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      1000,
      postgresConnectionOptions
    )

    await coordinator.increment(1)
    assert.equal(await coordinator.balance, 4)
    await coordinator.increment(4)
    assert.equal(await coordinator.balance, 0)
    await coordinator.reset()
    await coordinator.shutdown()
  })

  test('total resets after interval', async ({ assert }) => {
    const interval = 1000
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      interval,
      postgresConnectionOptions
    )

    await coordinator.increment(2)
    assert.equal(await coordinator.balance, 3)

    await new Promise((resolve) => setTimeout(resolve, interval + 50))

    assert.equal(await coordinator.balance, 5)
    await coordinator.reset()
    await coordinator.shutdown()
  })
})
