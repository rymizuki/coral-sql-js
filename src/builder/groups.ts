import { ensureToSQL } from '../options'
import {
  FieldPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { isFieldPort } from '../utils/type-guards'
import { Field } from './field'

export class Groups {
  private rows: FieldPort[] = []

  add(field: SQLBuilderField): void {
    if (typeof field === 'string') {
      this.rows.push(new Field(field))
    } else if (isFieldPort(field)) {
      this.rows.push(field)
    } else {
      // SQLBuilderPort の場合、サブクエリとして処理
      this.rows.push({
        getContent: (options) => {
          // 親のbindingsオブジェクトを使用してsubqueryを実行
          const [sql] = field.toSQL(options)
          return `(${sql})`
        }
      })
    }
  }

  toSQL(options: SQLBuilderToSQLInputOptions): string | null {
    if (!this.rows.length) {
      return null
    }

    return this.rows.map((field) => field.getContent(ensureToSQL(options))).join(',')
  }
}
