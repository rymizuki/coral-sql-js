import { ensureToSQL } from '../options'
import {
  FieldPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { escape } from '../utils/escape'
import { Field } from './field'

export class Columns {
  private rows: { field: FieldPort; as?: string }[] = []

  add(name: SQLBuilderField, as?: string): void {
    let field: FieldPort
    if (typeof name === 'string') {
      field = new Field(name)
    } else if ('getContent' in name) {
      field = name
    } else {
      // SQLBuilderPort の場合、サブクエリとして処理
      field = {
        getContent: (options) => `(${name.toSQL(options)[0]})`
      }
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
        return `${indent}${field.getContent(options)}${
          as ? ' AS ' + escape(as, { quote: options?.quote }) : ''
        }`
      })
      .join(',\n')
  }
}
