/*
 * @adonisjs/validator
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SyncValidation } from 'Validator'
import { wrapCompile, getFieldValue } from '../../Validator/helpers'

const RULE_NAME = 'greaterThan'
const DEFAULT_MESSAGE = 'greaterThan validation failed'

export const greaterThan: SyncValidation<{ field: string }> = {
  compile: wrapCompile(RULE_NAME, ['number'], ([field]) => {
    if (typeof field !== 'string') {
      throw new Error(`"${RULE_NAME}": expects a "field"`)
    }

    return {
      compiledOptions: {
        field,
      },
    }
  }),
  validate(value, compiledOptions, { errorReporter, pointer, arrayExpressionPointer, root, tip }) {
    const { field } = compiledOptions
    const fieldValue = parseFloat(getFieldValue(field, root, tip))
    if (typeof value !== 'number') {
      return
    }

    if (value <= fieldValue) {
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
