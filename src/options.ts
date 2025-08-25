import { Bindings } from './builder/bindings'
import { SQLBuilderToSQLInputOptions, SQLBuilderToSQLOptions } from './types'

export const ensureToSQL = (
  input: SQLBuilderToSQLInputOptions = {}
): SQLBuilderToSQLOptions => {
  const placeholder = input.placeholder ?? '?'
  const driver = input.driver ?? 'mysql'
  const quote = input.quote ?? getDefaultQuote(driver)
  
  const defaults = {
    placeholder,
    indent: '  ',
    bindings: new Bindings(placeholder),
    quote,
    driver
  }
  
  // input.bindingsが存在する場合はそれを使用、存在しない場合のみデフォルトのbindingsを使用
  const result: SQLBuilderToSQLOptions = Object.assign({}, defaults, input)
  if (input.bindings) {
    result.bindings = input.bindings
  }
  
  return result
}

const getDefaultQuote = (driver: 'mysql' | 'postgresql' | 'sqlite'): string => {
  switch (driver) {
    case 'mysql':
      return '`'
    case 'postgresql':
      return '"'
    case 'sqlite':
      return '`'
    default:
      return '`'
  }
}
