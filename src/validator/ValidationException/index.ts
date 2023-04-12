/*
 * @adonisjs/validator
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Exception } from '@poppinss/utils'

/**
 * Validation exception raised by the error reporters. The handle method is called
 * automatically during an HTTP request by AdonisJS to self handle the exception
 */
export class ValidationException extends Exception {
  constructor(public flashToSession: boolean, public messages?: any) {
    super('Validation Exception', 422, 'E_VALIDATION_FAILURE')
  }
}
