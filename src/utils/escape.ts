import { Field } from '../builder/field'
import { RawSQL } from '../builder/raw-sql'
import { FieldPort, RawSQLPort } from '../types'

/**
 * Mark the field not to be escaped.
 *
 * ```typescript
 * import { createBuilder, unescape } from 'coral-sql'
 *
 * const [sql, bindings] = createBuilder()
 *   .column('age')
 *   .column(unescape('COUNT(*)'), 'value')
 *   .from('users')
 *   .groupBy('age')
 *   .toSQL()
 * // sql: SELECT `age`, COUNT(*) AS `value` FROM `users` GROUP BY `age`
 * // bindings: []
 * ```
 *
 * @param field field's name. (e.g.) COUNT(*)
 * @returns RawSQLPort
 */
export const unescape = (field: string): RawSQLPort => {
  return new RawSQL(field)
}

/**
 * Column reference for the right-hand side of a condition.
 *
 * ```typescript
 * import { createConditions, column_ref } from 'coral-sql'
 *
 * createConditions().and('p.id', '=', column_ref('u.passport_id'))
 * // (`p`.`id` = `u`.`passport_id`)
 * ```
 *
 * @param column column's name. (e.g.) u.passport_id
 * @returns FieldPort
 */
export const column_ref = (column: string): FieldPort => {
  return new Field(column)
}

const isWrappedIn = (fragment: string, quote: string): boolean => {
  if (quote === '') {
    return false
  }
  if (fragment.length <= quote.length * 2) {
    return false
  }
  if (!fragment.startsWith(quote) || !fragment.endsWith(quote)) {
    return false
  }
  const inner = fragment.slice(quote.length, fragment.length - quote.length)
  return !inner.includes(quote) && !inner.includes('\\')
}

export const escape = (
  field: string,
  options: { quote?: string | null } = {}
): string => {
  const fragments = field.split('.')
  const quote =
    options.quote === null
      ? ''
      : options.quote !== undefined
      ? options.quote
      : '`'
  const output = fragments
    .map((fragment) => {
      if (isWrappedIn(fragment, quote)) {
        return fragment
      }
      return quote + fragment.split(quote).join(quote + quote) + quote
    })
    .join('.')
  return output
}
