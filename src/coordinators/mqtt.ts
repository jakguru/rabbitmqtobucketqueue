import { CoordinatorDriverBase } from 'abstracts'
import type * as RMQBQ from 'contracts/RMQBQ'

export class MQTTCoordinator extends CoordinatorDriverBase<RMQBQ.MQTTOptions> {
  /**
   * {@inheritDoc CoordinatorDriverBase.constructor}
   * @param options Options for connecting to the MQTT Broker
   */
  constructor(queue: string, maxBatch: number, interval: number, options: RMQBQ.MQTTOptions) {
    super(queue, maxBatch, interval, options)
  }

  public get balance(): number {
    return 0
  }

  public async increment(_count: number): Promise<void> {
    return
  }
}
