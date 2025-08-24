import { ensureToSQL } from '../options'
import {
  FieldPort,
  SQLBuilderBindingValue,
  SQLBuilderConditionExpressionPort,
  SQLBuilderConditionPort,
  SQLBuilderField,
  SQLBuilderToSQLInputOptions
} from '../types'
import { Field } from './field'

export class Condition implements SQLBuilderConditionPort {
  private field: FieldPort | SQLBuilderConditionExpressionPort
  private expr: SQLBuilderConditionExpressionPort

  constructor(field: SQLBuilderField | SQLBuilderConditionExpressionPort, expr: SQLBuilderConditionExpressionPort) {
    if (typeof field === 'string') {
      this.field = new Field(field)
    } else if ('getContent' in field) {
      // It's a FieldPort
      this.field = field
    } else if ('toSQL' in field && typeof field.toSQL === 'function') {
      // Check if it's SQLBuilderPort (has toSQL but not getContent)
      if (!('getContent' in field)) {
        // SQLBuilderPort の場合、サブクエリとして処理
        this.field = {
          getContent: (options) => `(${field.toSQL(options)[0]})`
        }
      } else {
        // It's either FieldPort or SQLBuilderConditionExpressionPort
        this.field = field
      }
    } else {
      this.field = field as unknown as FieldPort
    }
    this.expr = expr
  }

  toSQL(
    input?: SQLBuilderToSQLInputOptions
  ): [string, SQLBuilderBindingValue[]] {
    const options = ensureToSQL(input)
    const [expr_sql] = this.expr.toSQL(options)
    
    // Handle different field types
    if ('getContent' in this.field) {
      // It's a FieldPort
      const sql = `(${this.field.getContent(options)} ${expr_sql})`
      return [sql, options.bindings.getBindParameters()]
    } else {
      // It's a SQLBuilderConditionExpressionPort
      const [field_sql] = this.field.toSQL(options)
      const sql = `(${field_sql} ${expr_sql})`
      return [sql, options.bindings.getBindParameters()]
    }
  }
}
