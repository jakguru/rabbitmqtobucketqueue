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

const RULE_NAME = 'max'
const DEFAULT_MESSAGE = 'max validation failed'

export const max: SyncValidation<{ max: number }> = {
  compile: wrapCompile(RULE_NAME, ['number'], ([max]) => {
    if (typeof max !== 'number') {
      throw new Error(`The max value for "${RULE_NAME}" must be defined as number`)
    }

    return {
      compiledOptions: {
        max,
      },
    }
  }),
  validate(value, compiledOptions, { errorReporter, pointer, arrayExpressionPointer }) {
    if (typeof value !== 'number') {
      return
    }

    if (value > compiledOptions.max) {
      errorReporter.report(
        pointer,
        RULE_NAME,
        DEFAULT_MESSAGE,
        arrayExpressionPointer,
        compiledOptions
      )
    }
  },
}
