import type amqplib from 'amqplib'

export interface Connection extends amqplib.Connection {}

export interface ConstructorCallback {
  (error: Error | undefined, connection: Connection | undefined): void
}

export interface ConnectionNetConnection {
  serverProperties: amqplib.ServerProperties
}
