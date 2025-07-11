import { Field } from '../builder/field'
import { FieldPort } from '../types'

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
 * @returns FieldPort
 */
export const unescape = (field: string): FieldPort => {
  return new Field(field, true)
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
      if (/(?:"(?:.+?)")|(?:'(?:.+?)')|(?:`(?:.+?)`)/.test(fragment)) {
        return fragment
      }
      return quote + fragment + quote
    })
    .join('.')
  return output
}
