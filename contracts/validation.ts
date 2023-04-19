export interface ValidationType<T = any> {
  (value: T): true | string | Promise<true> | Promise<string>
}

export type ValidationMessage = string | ((value: any) => string)

export interface DetailedValidationError {
  attribute: string
  value: any
  validator: string
  globalOptions: any
  attributes: any
  options: any
  error: string
}
