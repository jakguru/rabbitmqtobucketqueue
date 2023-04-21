export * from './src/RabbitMQToBucketQueue'
export * from './src/CoordinatorTestFailedError'
export * from './contracts'
export * from './abstracts'
export * from './src/coordinators'
export * from './extendables'

/**
 * @todo Create an exportable coordinator server + driver based on the memory driver which can be used instead of database-based solutions.
 * Should be able to be hooked into an existing server (like socket.io does), or as a standalone server.
 * Should *not* be an HTTP server, but rather a TCP server.
 */

/**
 * @todo Create an exportable ToRabbitMQBucketQueue class which can be used to send items to a RabbitMQ queue.
 * It should use a confirmChannel to allow for checking if the message was delivered successfully.
 * Should use similar configuration options to the RabbitMQToBucketQueue class for configuration, but does not require a coordinator
 * or any information related to rate-limiting
 */
