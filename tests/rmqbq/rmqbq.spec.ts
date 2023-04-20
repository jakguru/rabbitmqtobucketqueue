import { test } from '@japa/runner'
import { RabbitMQToBucketQueue } from '../../src/RabbitMQToBucketQueue'
import { ValidationError } from '../../src/validation/ValidationError'
import { GetBadValuesForKey } from './variations'
import { baseConfig, ResolveConfig, variationConfigurations } from './configurations'

test.group('RabbitMQToBucketQueue', (group) => {
  const errors = new Set()
  group.tap((test) => test.tags(['rmqbq']))
  group.setup(async () => {
    await Promise.all([baseConfig.connection, baseConfig.channel, baseConfig.confirmChannel])
  })
  group.teardown(async () => {
    const [connection] = await Promise.all([
      baseConfig.connection,
      baseConfig.channel,
      baseConfig.confirmChannel,
    ])
    await connection.close()
    console.log(errors)
  })

  test('Validation Errors are thrown when there is no configuration, or the configuration is not an object', async ({
    assert,
  }) => {
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize()
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(true)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(0)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize('test')
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize([])
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(null)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(undefined)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(void 0)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(() => {})
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
    }
  })

  test('Validation Errors are thrown when there is a conflicting configuration', async ({
    assert,
  }) => {
    const config = await ResolveConfig(baseConfig.config)
    try {
      // @ts-ignore
      await RabbitMQToBucketQueue.initialize(config)
      assert.fail('Should have thrown an error')
    } catch (error) {
      assert.instanceOf(error, ValidationError)
      error.errors.forEach((e) => errors.add(e))
      assert.deepEqual(error.errors, ['onSpill and onItem cannot be defined at the same time'])
    }
  })

  for (const variation in variationConfigurations) {
    test(`Validation Errors are thrown when there are issues with the configuration: ${variation}`)
      .with([variationConfigurations[variation]])
      .run(async ({ assert }, unresolved) => {
        const full = await ResolveConfig(unresolved)
        const toTest: any = {}
        try {
          // @ts-ignore
          await RabbitMQToBucketQueue.initialize(toTest)
          assert.fail('Should have thrown an error')
        } catch (error) {
          assert.instanceOf(error, ValidationError)
          error.errors.forEach((e) => errors.add(e))
          assert.deepEqual(error.errors, [
            'configuration attribute "queue" must be of type string',
            'configuration attribute "debug" must be of type boolean',
          ])
        }
        for (const key in full) {
          const badValues = [...GetBadValuesForKey(key)]
          for (let bi = 0; bi < badValues.length; bi++) {
            const bad = badValues[bi]
            toTest[key] = bad
            try {
              // @ts-ignore
              const instance = await RabbitMQToBucketQueue.initialize(Object.assign({}, toTest))
              if (Object.keys(toTest).length !== Object.keys(full).length) {
                assert.fail('Should have thrown an error')
              } else {
                assert.instanceOf(instance, RabbitMQToBucketQueue)
                await instance.shutdown()
              }
            } catch (error) {
              if (!(error instanceof ValidationError)) {
                console.log(error)
              }
              assert.instanceOf(error, ValidationError)
              error.errors.forEach((e) => errors.add(e))
            }
          }
          toTest[key] = full[key]
          try {
            // @ts-ignore
            const instance = await RabbitMQToBucketQueue.initialize(Object.assign({}, toTest))
            if (Object.keys(toTest).length !== Object.keys(full).length) {
              assert.fail('Should have thrown an error')
            } else {
              assert.instanceOf(instance, RabbitMQToBucketQueue)
              await instance.shutdown()
            }
          } catch (error) {
            if (!(error instanceof ValidationError)) {
              console.log(error)
            }
            assert.instanceOf(error, ValidationError)
            error.errors.forEach((e) => errors.add(e))
          }
        }
      })
  }
})
