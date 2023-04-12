import { assert } from '@japa/assert'
import { specReporter } from '@japa/spec-reporter'
import { runFailedTests } from '@japa/run-failed-tests'
import { processCliArgs, configure, run, TestContext } from '@japa/runner'
import type { Readable } from 'stream'

/*
|--------------------------------------------------------------------------
| Import the Docker API
|--------------------------------------------------------------------------
|
| Import and activate the docker API for use in the tests.
|
*/
import { Docker } from 'node-docker-api'
const docker = new Docker(undefined)
TestContext.getter('docker', () => docker)

const promisifyStream = (stream: Readable) =>
  new Promise((resolve, reject) => {
    stream.on('data', (d) => console.log(d.toString()))
    stream.on('end', resolve)
    stream.on('error', reject)
  })

/*
|--------------------------------------------------------------------------
| Configure tests
|--------------------------------------------------------------------------
|
| The configure method accepts the configuration to configure the Japa
| tests runner.
|
| The first method call "processCliArgs" process the command line arguments
| and turns them into a config object. Using this method is not mandatory.
|
| Please consult japa.dev/runner-config for the config docs.
*/
configure({
  ...processCliArgs(process.argv.slice(2)),
  ...{
    files: ['tests/**/*.spec.ts'],
    plugins: [assert(), runFailedTests()],
    reporters: [specReporter()],
    importer: (filePath) => import(filePath),
  },
})

/*
|--------------------------------------------------------------------------
| Run tests
|--------------------------------------------------------------------------
|
| The following "run" method is required to execute all the tests.
|
*/
console.log('Loading latest RabbitMQ image from Docker Hub')
docker.image
  .create({}, { fromImage: 'rabbitmq:3' })
  .then(async () => {
    console.log('Creating RabbitMQ Container')
    const container = await docker.container.create({
      Image: 'rabbitmq:3',
      ExposedPorts: {
        '5672/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '5672/tcp': [{ HostPort: '5672' }],
        },
      },
    })
    console.log('Starting RabbitMQ Container')
    await container.start()
    console.log('Waiting for RabbitMQ Server Startup')
    await new Promise((resolve) => {
      container
        .logs({
          follow: true,
          stdout: true,
          stderr: true,
        })
        .then((stream: Readable) => {
          stream.on('data', (d) => {
            if (d.toString().includes('Server startup complete')) {
              console.log('RabbitMQ Server startup complete')
              stream.destroy()
              return resolve(undefined)
            }
          })
          stream.on('end', resolve)
          stream.on('error', resolve)
        })
    })
    console.log('Starting Tests')
    await run()
    console.log('Tests Complete')
    console.log('Stopping RabbitMQ Container')
    await container.stop()
    console.log('Removing RabbitMQ Container')
    await container.delete()
  })
  .catch((err) => console.log(err))
