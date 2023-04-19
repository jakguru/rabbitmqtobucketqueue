import { ValidationType } from '../../../contracts/validation'
import { Channel, ConfirmChannel } from 'amqplib/lib/channel_model'

const queue: ValidationType = (value: any) => {
  return value instanceof Channel || value instanceof ConfirmChannel
    ? true
    : 'is not a rabbitmq channel or confirmChannel'
}
export default queue
