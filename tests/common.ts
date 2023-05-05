import { join } from 'path'
import type * as RMQBQ from '../contracts/RMQBQ'

export const amqplibConnectionOptions = {
  protocol: 'amqp',
  hostname: 'localhost',
  port: parseInt(`${process.env.RABBITMQ_PORT}`.toString()) || 5672,
  username: 'guest',
  password: 'guest',
  vhost: '/',
}

export const amqplibConnectionSocketOptions = {
  timeout: 1000,
}

export const redisConnectionOptions: RMQBQ.RedisOptions = {
  host: 'localhost',
  port: parseInt(`${process.env.REDIS_PORT}`.toString()) || 6379,
  db: 0,
}

export const postgresConnectionOptions: RMQBQ.DatabaseOptions = {
  table: 'rmqbq-testing',
  client: 'pg',
  connection: {
    host: 'localhost',
    port: parseInt(`${process.env.POSTGRES_PORT}`.toString()) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'postgres',
  },
}

export const mysqlConnectionOptions: RMQBQ.DatabaseOptions = {
  table: 'rmqbq-testing',
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: parseInt(`${process.env.MYSQL_PORT}`.toString()) || 3306,
    user: process.env.MYSQL_USER || 'mysql',
    password: process.env.MYSQL_PASSWORD || 'mysql',
    database: process.env.MYSQL_DATABASE || 'mysql',
  },
}

export const sqlite3ConnectionOptions: RMQBQ.DatabaseOptions = {
  table: 'rmqbq-testing',
  client: 'sqlite3',
  connection: {
    filename: join(__dirname, 'rmqbq-testing.sqlite3'),
  },
  useNullAsDefault: true,
}

export const mqttConnectionOptions: RMQBQ.MQTTOptions = {
  protocol: 'mqtt',
  host: 'localhost',
  port: parseInt(`${process.env.MQTT_PORT}`.toString()) || 1883,
}

export const liteConnectionOptions: RMQBQ.LiteOptions = {
  encryptionKey: process.env.LITE_KEY || 'rmqbq-testing',
  path: process.env.LITE_PATH || '/rmqbqc/',
  host: process.env.LITE_HOST || 'localhost',
  port: parseInt(`${process.env.LITE_PORT}`.toString()) || 6365,
  protocol: (process.env.LITE_PROTOCOL as 'http' | 'https' | 'ws' | 'wss') || 'http',
  allowInsecure: 'true' === process.env.LITE_ALLOW_INSECURE?.toLowerCase(),
}
