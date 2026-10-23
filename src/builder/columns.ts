import { ensureToSQL } from '../options'
import {
  FieldPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { escape } from '../utils/escape'
import {
  isFieldPort,
  isSQLBuilderPort,
  hasToSQLMethod
} from '../utils/type-guards'
import { Field } from './field'

export class Columns {
  private rows: { field: FieldPort; as?: string }[] = []

  add(name: SQLBuilderField, as?: string): void {
    let field: FieldPort
    if (typeof name === 'string') {
      field = new Field(name)
    } else if (isFieldPort(name)) {
      field = name
    } else if (hasToSQLMethod(name)) {
      // SQLBuilderPort or SQLBuilderConditionExpressionPort の場合
      field = {
        getContent: (options) => {
          const [sql] = name.toSQL(options)
          return isSQLBuilderPort(name) ? `(${sql})` : sql
        }
      }
    } else {
      throw new Error('Invalid field type')
    }
    this.rows.push({ field, as })
  }

  toSQL(options?: SQLBuilderToSQLInputOptions): string {
    const { indent } = ensureToSQL(options)
    if (!this.rows.length) {
      return `${indent}*`
    }
    return this.rows
      .map(({ field, as }) => {
        return `${indent}${field.getContent(ensureToSQL(options))}${
          as ? ' AS ' + escape(as, { quote: options?.quote }) : ''
        }`
      })
      .join(',\n')
  }
}
