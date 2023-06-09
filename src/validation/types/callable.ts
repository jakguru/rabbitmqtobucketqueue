import { ValidationType } from '../../../contracts/validation'

const callable: ValidationType = (value: any) => {
  return typeof value === 'function' &&
    value instanceof Function &&
    'undefined' === typeof value.prototype
    ? true
    : 'must be a callable function'
}
export default callable
