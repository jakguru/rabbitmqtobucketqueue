/*
 * @adonisjs/validator
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { SyncValidation } from 'Validator'
import { exists, getFieldValue, wrapCompile } from '../../Validator/helpers'

const RULE_NAME = 'requiredWhenStringAndValue'
const DEFAULT_MESSAGE = 'requiredWhenStringAndValue validation failed'

/**
 * Return value of the compile function
 */
type CompileReturnType = {
  kind: 'memory' | 'redis' | 'mqtt' | 'database'
  field: string
  ref?: string
}

/**
 * Ensure the value exists when defined expectation passed.
 * `null`, `undefined` and `empty string` fails the validation.
 */
export const requiredWhenStringAndValue: SyncValidation<CompileReturnType> = {
  compile: wrapCompile<CompileReturnType>(RULE_NAME, [], ([field, kind]) => {
    /**
     * Ensure "field", "kind" are defined
     */
    if (!field || !kind) {
      throw new Error(`"${RULE_NAME}": expects a "field", "kind"`)
    }

    return {
      allowUndefineds: true,
      compiledOptions: {
        kind,
        field,
      },
    }
  }),
  validate(value, compiledOptions, { errorReporter, pointer, arrayExpressionPointer, root, tip }) {
    const { kind, field } = compiledOptions
    const fieldValue = getFieldValue(field, root, tip)
    if ('string' === typeof fieldValue && fieldValue === kind && !exists(value)) {
      errorReporter.report(pointer, RULE_NAME, DEFAULT_MESSAGE, arrayExpressionPointer, {
        otherField: field,
        kind: kind,
      })
    }
  },
}
