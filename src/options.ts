import { Bindings } from './builder/bindings'
import { SQLBuilderToSQLInputOptions, SQLBuilderToSQLOptions } from './types'

export const ensureToSQL = (
  input: SQLBuilderToSQLInputOptions = {}
): SQLBuilderToSQLOptions => {
  const placeholder = input.placeholder ?? '?'
  return Object.assign(
    {},
    {
      placeholder,
      indent: '  ',
      bindings: new Bindings(placeholder),
      quote: '`'
    },
    input
  )
}
