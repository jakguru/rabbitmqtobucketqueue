# RabbitMQ to Bucket Queue

![Doc Coverage Badge](./coverage.svg)

A RabbitMQ Consumer which limits the rate of consumption by consuming small batches of messages periodically and releasing them. Designed to enforce rate limits when working with external APIs.
It is also able to coordinate with other instances of itself to ensure that the rate limit is not exceeded using one of the following drivers:

* Redis (using [ioredis](https://www.npmjs.com/package/ioredis) or compatible client)
* MQTT (using [MQTT.js](https://www.npmjs.com/package/mqtt) or compatible client)
* Database (using [Knex.js](https://www.npmjs.com/package/knex) or compatible client)

You can also create your own driver which extends the [CoordinatorDriverBase](./classes/CoordinatorDriverBase.html) class.

## Why RabbitMQ and not ...?

RabbitMQ is one of the most mature acknowledgement-based queueing systems available.
It was specifically designed for:

* ensuring that messages are not lost
* messages are are processed only once (as much as possible)
* clients can be made aware of the status of messages (acknowledged, rejected, etc)

RabbitMQ is also scalable and can be configured to be highly available.

## Why do I need a Coordinator?

RabbitMQ does not have any real concept of rate-limiting. It delivers messages as quickly as the consumer can consume them.
This is great for scenarios where there is no rate-limiting requirement, but not so great for scenarios where you need to ensure that you do not exceed a certain delivery rate.
A Coordinator is used to ensure that the rate limit is not exceeded. While there is a "memory" coordinator, it is recommended that you use a coordinator which runs in a seperate process in order to ensure that the rate limit is not exceeded even if the consumer process is restarted.
This also allows for coordination between multiple consumers (instances), which means that clustered applications can appropriatly honor rate limits without being limited to a single processing thread.

## Installation

```bash
npm install @jakguru/rabbitmqtobucketqueue
```

## Initialization

First, import / require the `RabbitMQToBucketQueue` class:

```typescript
import { RabbitMQToBucketQueue } from '@jakguru/rabbitmqtobucketqueue';
// or
const { RabbitMQToBucketQueue } = require('@jakguru/rabbitmqtobucketqueue');
```

Then initialize it with a configuration object:

```typescript
const myConfiguration = {
    queue: 'my-queue',
    onItem: async (item) => {
        // do something with the item. on failure, throw an error
    },
}

RabbitMQToBucketQueue.initialize().then((instance) => {
    // do your magic
})
```

## Configuration
