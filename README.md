# RabbitMQ to Bucket Queue

A RabbitMQ Consumer which limits the rate of consumption by consuming small batches of messages periodically and releasing them. Designed to enforce rate limits when working with external APIs.
It is also able to coordinate with other instances of itself to ensure that the rate limit is not exceeded using one of the following drivers:

* Redis (using [ioredis](https://www.npmjs.com/package/ioredis) or compatible client)
* MQTT (using [MQTT.js](https://www.npmjs.com/package/mqtt) or compatible client)
* Database (using [Knex.js](https://www.npmjs.com/package/knex) or compatible client)

You can also create your own driver (implementing the `CoordinatorDriver` interface)