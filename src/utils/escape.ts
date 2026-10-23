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
  const quoted =
    quote === '`'
      ? /^(?:`[^`\\]+`|"[^"\\]+"|'[^'\\]+')$/
      : /^(?:"[^"\\]+"|'[^'\\]+')$/
  const output = fragments
    .map((fragment) => {
      if (quoted.test(fragment)) {
        return fragment
      }
      return quote + fragment.split(quote).join(quote + quote) + quote
    })
    .join('.')
  return output
}
