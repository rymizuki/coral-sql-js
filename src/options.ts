import { Bindings } from './builder/bindings'
import { SQLBuilderToSQLInputOptions, SQLBuilderToSQLOptions } from './types'

export const ensureToSQL = (
  input: SQLBuilderToSQLInputOptions = {}
): SQLBuilderToSQLOptions => {
  return Object.assign(
    {},
    {
      indent: '  ',
      bindings: new Bindings()
    },
    input
  )
}
