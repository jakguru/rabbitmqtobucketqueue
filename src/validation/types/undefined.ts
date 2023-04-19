import { ValidationType } from '../../../contracts/validation'

const undefinedType: ValidationType = (value: any) => {
  return typeof value === 'undefined' ? true : 'must be undefined'
}
export default undefinedType
