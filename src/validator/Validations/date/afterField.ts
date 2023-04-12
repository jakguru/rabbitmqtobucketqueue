/*
 * @adonisjs/validator
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SyncValidation } from 'Validator'

import { wrapCompile } from '../../Validator/helpers'
import { compile, validate, CompileReturnType } from './helpers/field'

const RULE_NAME = 'afterField'
const DEFAULT_MESSAGE = 'after date validation failed'

/**
 * Ensure the date is after the defined field.
 */
export const afterField: SyncValidation<CompileReturnType> = {
  compile: wrapCompile(RULE_NAME, [], (options, _, __, rulesTree) => {
    return compile(RULE_NAME, '>', options, rulesTree)
  }),
  validate(value, compiledOptions, runtimeOptions) {
    return validate(RULE_NAME, DEFAULT_MESSAGE, value, compiledOptions, runtimeOptions)
  },
}
