import { ValidationType } from '../../../contracts/validation'
import { CoordinatorDriverBase } from '../../../abstracts/CoordinatorDriverBase'

const coordinator: ValidationType = (value: any) => {
  return value instanceof CoordinatorDriverBase ||
    ('string' === typeof value && ['memory', 'redis', 'mqtt', 'database'].includes(value))
    ? true
    : 'is not a built-in coordinator driver or a class which extends CoordinatorDriverBase'
}
export default coordinator
