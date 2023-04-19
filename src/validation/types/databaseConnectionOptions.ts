import { ValidationType } from '../../../contracts/validation'

const databaseConnectionOptions: ValidationType = (value: any) => {
  return typeof value === 'object' &&
    null !== value &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
    ? true
    : 'must be a non-array & non-null object with the client connection parameters'
}
export default databaseConnectionOptions
