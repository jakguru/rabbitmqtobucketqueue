export * from './src/RabbitMQToBucketQueue'
export * from './src/CoordinatorTestFailedError'
export * from './src/ToRabbitMQBucketQueue'
export * from './src/rabbitmq/'
export * from './contracts'
export * from './abstracts'
export * from './src/coordinators'
export * from './src/encryption'
export * from './extendables'
export * from './src/CoordinationClient'
export * from './src/CoordinationServer'

/**
 * @todo Create a wrapper which wraps both the publisher and the consumer and allows for a request to receive a promised response.
 * Should be cross-process compatible, allowing for a publisher and consumer to be on different machines, thus meaning that an event coordinator is required.
 * The event coordinator should be something like a private socket.io which encrypts messages in both directions.
 */
