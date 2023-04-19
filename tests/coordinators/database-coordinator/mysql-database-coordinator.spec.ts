import { test } from '@japa/runner'
import { DatabaseCoordinator } from '../../../src/coordinators/database'
import { mysqlConnectionOptions } from '../../common'
import type * as RMQBQ from '../../../contracts/RMQBQ'

test.group('DatabaseCoordinator - MySQL', (group) => {
  group.tap((test) => test.tags(['coordinators', 'database', 'mysql']))
  test('balance returns correct value', async ({ assert }) => {
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      1000,
      mysqlConnectionOptions
    )
    await coordinator.reset()
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
    .setup(async () => {
      await DatabaseCoordinator.prepare(mysqlConnectionOptions, true)
    })
    .teardown(async () => {
      await DatabaseCoordinator.cleanup(mysqlConnectionOptions, true)
    })

  test('increment increases total correctly', async ({ assert }) => {
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      1000,
      mysqlConnectionOptions
    )
    await coordinator.reset()
    await coordinator.increment(1)
    assert.equal(await coordinator.balance, 4)
    await coordinator.increment(4)
    assert.equal(await coordinator.balance, 0)
    await coordinator.reset()
    await coordinator.shutdown()
  })
    .setup(async () => {
      await DatabaseCoordinator.prepare(mysqlConnectionOptions, true)
    })
    .teardown(async () => {
      await DatabaseCoordinator.cleanup(mysqlConnectionOptions, true)
    })

  test('total resets after interval', async ({ assert }) => {
    const interval = 1000
    const coordinator = await DatabaseCoordinator.initialize<RMQBQ.DatabaseOptions>(
      'test-queue',
      5,
      interval,
      mysqlConnectionOptions
    )
    await coordinator.reset()
    await coordinator.increment(2)
    assert.equal(await coordinator.balance, 3)

    await new Promise((resolve) => setTimeout(resolve, interval + 50))

    assert.equal(await coordinator.balance, 5)
    await coordinator.reset()
    await coordinator.shutdown()
  })
    .setup(async () => {
      await DatabaseCoordinator.prepare(mysqlConnectionOptions, true)
    })
    .teardown(async () => {
      await DatabaseCoordinator.cleanup(mysqlConnectionOptions, true)
    })
})
