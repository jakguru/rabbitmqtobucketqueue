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
})
