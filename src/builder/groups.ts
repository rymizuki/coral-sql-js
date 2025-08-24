import {
  FieldPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { Field } from './field'

export class Groups {
  private rows: FieldPort[] = []

  add(field: SQLBuilderField): void {
    if (typeof field === 'string') {
      this.rows.push(new Field(field))
    } else if ('getContent' in field) {
      this.rows.push(field)
    } else {
      // SQLBuilderPort の場合、サブクエリとして処理
      this.rows.push({
        getContent: (options) => `(${field.toSQL(options)[0]})`
      })
    }
  }

  toSQL(options: SQLBuilderToSQLInputOptions): string | null {
    if (!this.rows.length) {
      return null
    }

    return this.rows.map((field) => field.getContent(options)).join(',')
  }
}
