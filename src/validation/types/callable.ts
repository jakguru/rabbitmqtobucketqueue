import { ValidationType } from '../../../contracts/validation'

const callable: ValidationType = (value: any) => {
  return typeof value === 'function' ? true : 'must be a callable function'
}
export default callable
