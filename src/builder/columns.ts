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
    } else if ('toSQL' in name) {
      // SQLBuilderPort or SQLBuilderConditionExpressionPort の場合
      field = {
        getContent: (options) => {
          if ('select' in name) {
            // SQLBuilderPortの場合（サブクエリ）
            // サブクエリの場合は、toSQL内部でbindingsが適切に処理されるので
            // ここでは手動でbindingsを追加しない
            const [sql] = name.toSQL(options)
            return `(${sql})`
          } else {
            // SQLBuilderConditionExpressionPortの場合（JSON関数など）
            // 独立した関数の場合はbindingsを手動で追加する必要がある
            const [sql, bindings] = name.toSQL(options)
            if (bindings && bindings.length > 0 && options?.bindings) {
              bindings.forEach((binding) => options.bindings!.create(binding))
            }
            return sql
          }
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
