import type * as RMQBQ from './RMQBQ'

export interface SerilizeMessageCallback<T = any> {
  (item: T): Buffer | Promise<Buffer>
}

export type Config<T = any> = Pick<
  RMQBQ.Config,
  | 'queue'
  | 'rmqChannel'
  | 'rmqQueueType'
  | 'rmqConnectionOptions'
  | 'rmqQueueOptions'
  | 'debug'
  | 'loggerOptions'
> & {
  serializeItem?: SerilizeMessageCallback<T>
}

export type DefaultOptions<T = any> = Omit<Config<T>, 'queue' | 'serializeItem'>

export type ConfigMergedWithDefaults<T = Buffer> = Partial<Config<T>> &
  Pick<Config<T>, 'queue' | 'debug' | 'loggerOptions'>
