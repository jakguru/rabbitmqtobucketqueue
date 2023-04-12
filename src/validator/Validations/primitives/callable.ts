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

const DEFAULT_MESSAGE = 'function validation failed'
const RULE_NAME = 'function'

/**
 * Ensure value is a valid function
 */
export const callable: SyncValidation = {
  compile: wrapCompile(RULE_NAME),
  validate(value, _, { errorReporter, pointer, arrayExpressionPointer }) {
    if (typeof value !== 'function') {
      errorReporter.report(pointer, RULE_NAME, DEFAULT_MESSAGE, arrayExpressionPointer)
    }
  },
}
