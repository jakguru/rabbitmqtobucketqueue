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
import { CoordinatorDriverBase } from '../../../../abstracts'

const DEFAULT_MESSAGE = 'coordinatorDriver validation failed'
const RULE_NAME = 'object'

/**
 * Ensure value is a valid object
 */
export const coordinatorDriver: SyncValidation = {
  compile: wrapCompile(RULE_NAME),
  validate(value, _, { errorReporter, pointer, arrayExpressionPointer }) {
    if (
      typeof value !== 'string' ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      null === value ||
      !((value as any) instanceof CoordinatorDriverBase)
    ) {
      errorReporter.report(pointer, RULE_NAME, DEFAULT_MESSAGE, arrayExpressionPointer)
    }
  },
}
